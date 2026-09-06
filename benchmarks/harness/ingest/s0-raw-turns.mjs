/**
 * Rung S0 — every turn, verbatim, as a memory. No model call at all.
 *
 * ## Why the floor is a real rung and not scaffolding
 *
 * S0 is the only rung that CANNOT MISS A CLAIM, because it does not decide what a claim is. Every later rung
 * extracts, and extraction is lossy: anything it drops is gone from the ranked list even though the store
 * technically held it here. So if the extractor on a higher rung is mediocre, S0 alone can beat S0-plus-a-bad-S2
 * — which is an argument for keeping this rung permanently rather than treating it as a baseline to beat.
 *
 * It also costs nothing, which makes it the honest denominator. Every rung above has to justify its tokens
 * against a floor that spends none.
 *
 * ## What it deliberately does not do
 *
 * No filtering of greetings or acknowledgements. It would be easy — "Hey Mel! Good to see you!" carries no
 * durable fact — and it would make this rung a judgement about what matters, which is exactly what the rungs
 * above are for. The floor stores the transcript. Anything cleverer belongs one rung up where its cost is
 * visible.
 *
 * ## The question-blindness rule
 *
 * This module receives a conversation and nothing else. It does not import `loadQuestions`, cannot reach the
 * answer key, and a gate refuses any ingest module that names the question set —
 * `testing/standalone/benchmark-ingest-cannot-see-the-questions.test.js`.
 */

import { TURN_PROPERTIES } from './_schemas.mjs';

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
    /* One turn per record: exactly one source id, so `turns` is not carried. */
    utterance: { propertySchemas: TURN_PROPERTIES },
  },
};

export const rung = 's0';

/**
 * The knowledge types that carry this rung's content, passed to `recall` as `types`.
 *
 * Declared per rung rather than fixed in the runner because the rungs MODEL the same turns differently, and a
 * search that ignores that is not a fairer comparison — it is a worse one. Leaving it unset lets a rung's own
 * navigational records (its edges, its chrono) take ranked slots that the rung deliberately created them to
 * stay out of, so the measured difference between two rungs would partly be a difference in how much structure
 * each one had to elbow past.
 */
export const recallTypes = ['memory'];
export const needsModel = false;

/**
 * @param {object}   args
 * @param {object}   args.conversation  from `dataset/locomo.mjs#loadConversations` — no question data on it
 * @param {object}   args.ythril        the REST client
 * @param {string}   args.space         the space id, one per conversation
 * @returns {Promise<{records: number, modelCalls: number}>}
 */
export async function ingest({ conversation, ythril, space, entityIdsFor = null, onWritten = null }) {
  let records = 0;

  for (const session of conversation.sessions) {
    for (const turn of session.turns) {
      /*
       * SELF-CONTAINED TEXT, and this is the one judgement the floor does make.
       *
       * A bare turn body — "Yeah, that was in June" — is a sentence whose subject and time live in the turns
       * around it, and an embedding of it means almost nothing. Prefixing the speaker costs four tokens and
       * makes the record answer "who said this" without a second lookup.
       *
       * The date is NOT prefixed into the text. It is a property, because the session's date is exact and a
       * date inside prose is a string a retriever has to parse back out. Rung S0+ is where the date becomes a
       * record in its own right.
       */
      /*
       * TWO HOOKS, AND THE DIFFERENCE BETWEEN THEM IS THE WHOLE GRAPH RESULT.
       *
       * `entityIdsFor` puts entity ids on the memory. `onWritten` hands the created record to the rung above so
       * it can write real EDGES. They sound interchangeable and are not:
       *
       *   - `entityIds` is read by `memoryEmbedText`, which prepends the linked entities' NAMES to the fact
       *     before embedding. So it changes the ranking — measured at -1.5 points of strict evidence recall,
       *     because "Session 2 Caroline" in front of every turn dilutes it.
       *   - **Graph traversal does not read `entityIds` at all.** `traverseFromSeeds` queries the `_edges`
       *     collection; a memory that is not the `from` or `to` of an edge document has an empty frontier and
       *     produces no neighbours, whatever its `entityIds` say.
       *
       * The first version of S0+ used only `entityIdsFor`, so it paid the entire embedding cost and got none of
       * the traversal benefit. It was not a small effect either way: recall at traverse depth 0, 1 and 2
       * returned byte-identical results, and `graphNodes` was 0. A graph that nothing can walk into is not a
       * weak graph, it is an absent one, and only a sweep that ran all three depths could tell the difference.
       *
       * So S0+ now passes `onWritten` and NOT `entityIdsFor`: its turns embed exactly as S0's do, which makes
       * traverse-0 a clean control, and any difference at depth 2 is the graph and nothing else.
       */
      const created = await ythril.writeMemory(space, {
        fact: `${turn.speaker}: ${turn.text}`,
        type: 'utterance',
        ...(entityIdsFor ? { entityIds: entityIdsFor(turn, session) } : {}),
        properties: {
          session: session.index,
          turn: turn.id,
          speaker: turn.speaker,
          // ISO, so a string comparison is a date comparison. `recall`'s filter allowlist reaches
          // `properties.*` but not a chrono's native `startsAt`, so a mirrored date is the only way a caller
          // gets a time-bounded recall without a second call. See the specification's §3.
          statedOn: session.startsAt.slice(0, 10),
        },
      });
      records++;
      if (onWritten) records += await onWritten(created, turn, session);
    }
  }

  return { records, modelCalls: 0 };
}
