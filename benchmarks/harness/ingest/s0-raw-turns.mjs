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

export const rung = 's0';
export const needsModel = false;

/**
 * @param {object}   args
 * @param {object}   args.conversation  from `dataset/locomo.mjs#loadConversations` — no question data on it
 * @param {object}   args.ythril        the REST client
 * @param {string}   args.space         the space id, one per conversation
 * @returns {Promise<{records: number, modelCalls: number}>}
 */
export async function ingest({ conversation, ythril, space }) {
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
      await ythril.writeMemory(space, {
        fact: `${turn.speaker}: ${turn.text}`,
        type: 'utterance',
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
    }
  }

  return { records, modelCalls: 0 };
}
