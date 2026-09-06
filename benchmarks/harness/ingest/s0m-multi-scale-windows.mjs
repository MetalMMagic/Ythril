/**
 * Rung S0M — the same conversation chunked at TWO sizes at once, small and large.
 *
 * ## The measurement this is built from, rather than a hunch
 *
 * The failures of the best rung so far were counted, and they are not one problem:
 *
 * | | questions | first answer right |
 * |---|---|---|
 * | needs ONE turn | 160 | 61% |
 * | needs two | 21 | 14% |
 * | needs three or more | 18 | 0% |
 *
 * And of the 62 single-turn questions that missed, **31 had the answer at position 2 or 3** — the retriever
 * preferred a neighbouring window by a hair.
 *
 * Those two rows want opposite things. A question answered by one sentence wants a SHORT record, because a
 * five-turn window dilutes that sentence with four others and something else wins the top slot. A question
 * needing two turns wants a LONG record, because the two turns have to be inside one of them or no single
 * result can hold the answer. One window size has to pick a side, and every rung so far has picked one.
 *
 * ## What this does
 *
 * Writes both. Three-turn windows stepping by one, and nine-turn windows stepping by three, over the same
 * turns. A precise question matches a short record and gets it first; a question needing a pair matches the
 * long record that contains both. The retriever chooses per question, which is the thing a retriever is for.
 *
 * ## Why this is chunking and not padding
 *
 * The distinction that matters — the owner's rule is *"first answer must be right… not brute force"* — is
 * whether the change makes the top result more often correct, or merely makes the list wider so the answer
 * is somewhere in it. Multi-scale chunking is on the first side, and the numbers that prove or disprove it
 * are `all at rank 1` and `top record chars`, not coverage.
 *
 * **And it is charged for honestly.** Storing the same turns twice means the corpus holds roughly twice the
 * text, so under a fixed answer budget this rung returns FEWER records than a single-scale one — it is
 * spending its budget on duplicated content and has to earn that back by ranking better. If it does not, it
 * loses on exactly the number it is supposed to win on. Nothing about the second scale is free.
 *
 * ## Both scales, or the comparison means nothing
 *
 * Neither size is new: three-turn and nine-turn windows are ordinary values on the same axis the window rung
 * already sweeps. The claim here is specifically that having BOTH beats having either, so the sweep of single
 * sizes is the control, and it exists.
 */

import { WINDOW_PROPERTIES } from './_schemas.mjs';
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
    /*
     * `scale` is the reason this rung exists: a report that cannot say WHICH size answered cannot tell
     * "both were needed" from "the short ones did all the work". Declared as an enum so a third scale
     * cannot appear without being named here.
     */
    utterance: {
      propertySchemas: {
        ...WINDOW_PROPERTIES,
        scale: { type: 'string', required: true, enum: ['near', 'wide'] },
      },
    },
  },
};

export const rung = 's0m';
export const recallTypes = ['memory'];
export const needsModel = false;

/**
 * The two scales.
 *
 * Small is 3/1 — every adjacent pair of turns lives intact in some short window, so even the sharp scale
 * does not split a question and its answer. Large is 9/3, wide enough to hold an exchange and its
 * consequences, stepping by a third so the same overlap property holds there.
 *
 * Chosen as round values one clear step either side of the 5/2 the window rung was measured at, before this
 * rung produced a number. They are swept as a pair rather than hand-picked against the score.
 */
export const SMALL_SIZE = Number(process.env['BENCH_SMALL_SIZE'] ?? 3);
export const SMALL_STEP = Number(process.env['BENCH_SMALL_STEP'] ?? 1);
export const LARGE_SIZE = Number(process.env['BENCH_LARGE_SIZE'] ?? 9);
export const LARGE_STEP = Number(process.env['BENCH_LARGE_STEP'] ?? 3);

/**
 * Write every window of one size across one session.
 *
 * The `scale` lands in `properties`, which means it is part of the embedded text — one word, the same word
 * on every record of that size, so it shifts nothing between them. It is there because a report that cannot
 * say WHICH scale answered cannot tell "both sizes were needed" from "the small ones did all the work", and
 * that is the only question this rung exists to answer.
 */
async function writeWindows({ ythril, space, session, size, step, scale }) {
  const turns = session.turns;
  const day = session.startsAt.slice(0, 10);
  let written = 0;

  for (let i = 0; i < turns.length; i += step) {
    const window = turns.slice(i, i + size);
    if (window.length === 0) break;

    await ythril.writeMemory(space, {
      // Byte-identical to what the window rung writes, so a record here is the record it measured.
      fact: window.map(t => `${t.speaker}: ${t.text}`).join('\n'),
      type: 'utterance',
      properties: {
        session: session.index,
        turn: window.map(t => t.id).join(','),
        speaker: [...new Set(window.map(t => t.speaker))].join(','),
        statedOn: day,
        turns: window.length,
        scale,
      },
    });
    written++;

    // A short last window rather than none: stopping when a full one no longer fits drops the tail of every
    // session, and the end of a conversation is where its conclusions are.
    if (i + size >= turns.length) break;
  }
  return written;
}

/**
 * @param {object} args
 * @param {object} args.conversation  no question data on it
 * @param {object} args.ythril
 * @param {string} args.space
 * @returns {Promise<{records: number, modelCalls: number}>}
 */
export async function ingest({ conversation, ythril, space }) {
  let records = 0;
  for (const session of conversation.sessions) {
    records += await writeWindows({
      ythril, space, session, size: SMALL_SIZE, step: SMALL_STEP, scale: 'near',
    });
    records += await writeWindows({
      ythril, space, session, size: LARGE_SIZE, step: LARGE_STEP, scale: 'wide',
    });
  }
  return { records, modelCalls: 0 };
}
