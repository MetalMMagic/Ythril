/**
 * Rung S0L — the turns stay MEMORIES, and the graph reaches them anyway.
 *
 * ## The sentence this rung exists because the product outgrew
 *
 * `s0plus-deterministic-structure.mjs` records, in its own words, why it deliberately writes its turns with no
 * `entityIds`:
 *
 * > 1. **`entityIds` linking each turn to its session and speaker.** It changes the ranking — `memoryEmbedText`
 * >    prepends the linked entities' NAMES to the fact — and measured **-1.5 points** of strict evidence recall.
 * >    It buys nothing back: **graph traversal never reads `entityIds`.**
 *
 * That was true, measured, and correctly reasoned when it was written. **Both halves have since changed.**
 *
 * `recall`'s traverse now starts a walk from a NON-ENTITY seed: a matched memory has no edges of its own, so the
 * expansion begins at the entities its `entityIds` name, at hop 1. Reaching other memories back is opt-in —
 * `includeMemories`, `includeChrono`, `includeFiles`, all defaulting FALSE, because a match is counted with its
 * whole `_graph` subtree and every record admitted by default is paid for in matches that no longer fit.
 *
 * So the -1.5 points is still the price, and it is no longer buying nothing.
 *
 * ## Why this is a fair comparison and not a new trick
 *
 * `S0G` — the existing graph rung — says of itself that it is **a workaround, and should be read as one**. It
 * models the turns as ENTITIES for one reason: only an entity could be an edge endpoint, so only an entity could
 * be walked from. That shape is not what a user of this product would choose for a conversation; a turn is a
 * fact somebody stated, which is a memory.
 *
 * This rung asks the question S0G was standing in for: **with the product as it now is, does the graph pay for
 * itself on the natural shape?** Turns are memories, exactly as in S0 and S0+, with `entityIds` and nothing
 * else added. Same text, same one-record-per-turn granularity, same zero model calls.
 *
 * ## Session only, deliberately — the same decision S0G made and for the same reason
 *
 * A turn names its SESSION and not its speaker. With two participants, linking every one of ~600 turns to its
 * speaker means one hop from any match reaches the entire conversation — not a neighbourhood but the whole
 * corpus behind a node cap, where whichever neighbours the cap happened to keep would be indistinguishable from
 * a deliberate answer. Sessions divide the same turns into ~19 groups of ~22.
 *
 * It also keeps the embedding perturbation as small as the rung can make it. `memoryEmbedText` prepends the
 * linked entities' names, so one navigational name is prepended here rather than two — and the -1.5 points
 * quoted above was measured with session AND speaker. **Whatever this rung costs in ranking is therefore not
 * that number**, and the run reports its own traverse-0 score beside S0's so the cost is visible separately
 * from the benefit, exactly as S0G does.
 *
 * ## What a reader should be able to conclude
 *
 * - `S0L` at traverse 0 against `S0` — what the `entityIds` prepending costs the ranking, on its own.
 * - `S0L` at traverse 1 and 2 against `S0L` at 0 — what the graph buys back, on the natural record shape.
 * - `S0L` against `S0G` — whether the workaround was ever worth its re-modelling, now that it is not needed.
 *
 * If traverse 1 and 2 return byte-identical scores to traverse 0, the walk is not happening and the number to
 * check first is `graphNodes` — that is how the emptiness S0G was built around was found in the first place.
 *
 * ## The question-blindness rule
 *
 * Conversation in, records out. No import here can reach the question set, and a gate enforces it. This file
 * was written before its author had read a single LoCoMo question, which is the only way that rule means
 * anything.
 */

import { TURN_PROPERTIES, STRUCTURE_ENTITIES, SESSION_CHRONO } from './_schemas.mjs';
import * as s0 from './s0-raw-turns.mjs';

/**
 * What this corpus may contain, declared so the instance enforces it.
 *
 * A space defaults to `validationMode: 'strict'` and a declared collection's keys are an ALLOWLIST, so an
 * undeclared type is a 400 and a missing `required` property is a 400. Without a declaration strict mode
 * validates NOTHING: there is no rule for an undeclared type, so nothing can be violated.
 *
 * A benchmark needs that more than an application does. An application with a broken corpus throws; a
 * benchmark reports a NUMBER, and a corpus missing a field scores low and reads as a finding about retrieval.
 */
export const typeSchemas = {
  memory: {
    /* Turns stay memories and are written through S0's ingest, so they carry S0's properties. */
    utterance: { propertySchemas: TURN_PROPERTIES },
  },
  entity: STRUCTURE_ENTITIES,
  chrono: SESSION_CHRONO,
};

export const rung = 's0l';

/**
 * The turns are MEMORIES, like S0 and S0+ — that is the whole point of the rung.
 *
 * Filtered for the same reason S0G filters to `entity`: the session records and the chrono entries are
 * navigation, and a structural record with no embedding can still be returned by the LEXICAL half of hybrid
 * search. Suppressing an embedding removes a record from the vector channel, not from the keyword one.
 */
export const recallTypes = ['memory'];
export const needsModel = false;

/**
 * Merged into the `traverse` object by the runner when depth > 0.
 *
 * **Without `includeMemories` this rung measures nothing.** The walk would start correctly from the memory's
 * `entityIds`, reach the session entity at hop 1, and then be unable to return the sibling turns — because
 * bringing non-entity records back is opt-in and defaults to false. The result would be a recall that looks
 * expanded, reports `graphNodes > 0`, and contains no additional evidence: a plausible number measuring the
 * wrong thing, which is worse than a failure.
 */
export const traverseExtra = { includeMemories: true };

/**
 * @param {object} args
 * @param {object} args.conversation  no question data on it
 * @param {object} args.ythril
 * @param {string} args.space
 * @returns {Promise<{records: number, modelCalls: number}>}
 */
export async function ingest({ conversation, ythril, space }) {
  let records = 0;

  // ── The participants ──────────────────────────────────────────────────────
  // Written, but NOT linked to the turns — see the session-only note above. They exist so the chrono entries
  // can name them and so the graph has the same nodes S0+ and S0G give it, which keeps the rungs comparable
  // on everything except the one thing under test.
  const speakerIds = new Map();
  for (const name of conversation.speakers) {
    const created = await ythril.writeEntity(space, {
      name,
      type: 'person',
      description: 'A participant in this conversation.',
      properties: { role: 'participant' },
    });
    speakerIds.set(name, created.id ?? created._id);
    records++;
  }

  // ── The sessions, as the nodes a turn hangs off ───────────────────────────
  const sessionIds = new Map();
  for (const session of conversation.sessions) {
    const day = session.startsAt.slice(0, 10);
    const created = await ythril.writeEntity(space, {
      name: `Session ${session.index}`,
      type: 'session',
      properties: { session: session.index, startsOn: day, turns: session.turns.length },
      // Navigational, not a claim. An embedded "Session 7" competes for a ranked slot with the sentences that
      // answer things — and suppressing the embedding does not remove it from the graph, because traversal
      // reads links and edges rather than vectors.
      suppressEmbeddings: true,
    });
    sessionIds.set(session.index, created.id ?? created._id);
    records++;

    await ythril.writeChrono(space, {
      title: `Conversation session ${session.index}`,
      startsAt: session.startsAt,
      type: 'event',
      entityIds: [created.id ?? created._id, ...speakerIds.values()],
      properties: { session: session.index, startsOn: day },
    });
    records++;
  }

  // ── The turns, as memories that NAME their session ────────────────────────
  //
  // DELEGATED to the base rung through its `entityIdsFor` hook, rather than written again here. The claim this
  // rung makes is "S0's turns, plus a link" — and the only way to be sure the text, the type and the properties
  // are byte-identical to S0's is to let S0 write them. A second copy of the turn writer would make the
  // comparison depend on my retyping it correctly, which is the defect this codebase produces most.
  //
  // Last, because a memory's `entityIds` must RESOLVE: the session entity has to exist before a turn can name
  // it. Under strict linkage an unresolvable reference is a refusal, not a dangling link.
  const base = await s0.ingest({
    conversation,
    ythril,
    space,
    entityIdsFor: (_turn, session) => [sessionIds.get(session.index)],
  });
  records += base.records;

  // Summed rather than written as 0, for the reason S0+ gives: the claim is "whatever the base rung cost, plus
  // nothing", which stays true if the base rung ever stops being free.
  return { records, modelCalls: base.modelCalls };
}
