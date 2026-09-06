/**
 * Rung S0W — overlapping windows of consecutive turns, one record per window.
 *
 * ## The problem with one record per turn, which the other rungs all share
 *
 * A conversation turn is often not self-contained. *"Yeah, that's true!"* answers something, and on its own it
 * is unfindable by any query about what it agreed with. The evidence a question cites is frequently a PAIR —
 * somebody says a thing and the other replies — and one-record-per-turn asks the retriever to find both
 * independently, at which point a `topK` cut can take one and leave the other.
 *
 * That is what the "all evidence" metric punishes hardest, and it shows: multi-hop scores 35.7% against
 * single-hop's 74.1% on the same corpus and the same retriever.
 *
 * ## What this changes
 *
 * A record is a WINDOW of `SIZE` consecutive turns from one session, stepping by `STEP` so windows overlap.
 * Each record names every turn it covers, so retrieving one record retrieves all of them.
 *
 * Nothing else changes: same text, same speakers, same order, **no model call**, and the ingest still cannot
 * see a question.
 *
 * ## Why this is a legitimate strategy and not a way of gaming the count
 *
 * It is chunking — the oldest and most ordinary retrieval decision there is, and the model-free member of the
 * family the protocol already lists (session summaries, atomic facts). The retriever still returns `topK`
 * records and the answer is still budgeted; what changes is how much of the conversation one record accounts
 * for.
 *
 * **The cost is real and must be read beside the score.** A window is longer than a turn, so a match is less
 * precise about WHERE in the window the answer is, and a fixed byte budget holds fewer windows than turns.
 * The report's `mean records` column stays comparable, and the honest extra column is how many turns those
 * records covered — a strategy that wrapped the whole conversation in one record would score perfectly here
 * and be useless, which is the same trap `topK` sets.
 *
 * **And that claim was checked rather than argued, because the metric it was made under could not check it.**
 * The original score here was coverage — did the evidence appear anywhere in the results — which rises for
 * any strategy that returns more per record, so it could not tell chunking from padding. Re-measured at rank
 * (2026-09-06, 199 questions, equal 25 000-character budget):
 *
 * | rung | all at rank 1 | top record chars | mean depth |
 * |---|---|---|---|
 * | **this rung** | **50.8%** | 717 | 2.9 |
 * | `s0` one turn per record | 31.7% | 177 | 5.7 |
 *
 * The first result is right nineteen points more often, and a caller reads half as far for the rest. The top
 * record is four times bigger, which is the cost, and it is 717 characters rather than a transcript. The
 * strategy survives the stricter question; the number it was originally sold with did not.
 *
 * ## Overlap, and why STEP < SIZE
 *
 * With `STEP === SIZE` the windows tile without overlap, and an evidence pair that straddles a boundary is
 * split exactly as badly as one-record-per-turn splits it — the failure this rung exists to remove, moved to
 * a different place. Overlap means every adjacent pair lives intact inside at least one window.
 */
export const rung = 's0w';
export const recallTypes = ['memory'];
export const needsModel = false;

/**
 * Turns per window, and how far each window advances.
 *
 * Chosen before any result was read, and deliberately modest: 5 covers a short exchange and its reply, and a
 * step of 2 puts every adjacent pair inside a window without tripling the record count. Both are swept in the
 * grid rather than tuned by hand against the score, which is the difference between choosing a parameter and
 * fitting one.
 */
/**
 * What this corpus may contain, declared to the instance rather than trusted to the ingest.
 *
 * A space defaults to `validationMode: 'strict'`, and the keys of each collection are an ALLOWLIST — so an
 * undeclared type is refused, and a `required` property that is missing is refused. Without a declaration
 * strict mode validates NOTHING: there is no rule for an undeclared type, so there is nothing to violate.
 *
 * **A benchmark needs this more than an application does.** An application with a broken corpus throws. A
 * benchmark reports a number, and a corpus missing a field scores low and reads as a finding about
 * retrieval — the most expensive kind of wrong available here, and it has happened twice in one afternoon.
 * `turn` is the sharpest example: it is how a result is joined back to the answer key, so a rung that stops
 * writing it does not score badly, it scores ZERO.
 */
export const typeSchemas = {
  memory: {
    utterance: {
      propertySchemas: {
        session: { type: 'number', required: true, minimum: 1 },
        /*
         * NO GROUPS IN THIS PATTERN, and that is not style. The natural form —
         * `^D[0-9]+:[0-9]+(,D[0-9]+:[0-9]+)*$` — is refused by the instance as a ReDoS risk, and a refused
         * pattern surfaces as `does not match pattern` against the VALUE. So every correct record is
         * rejected, permanently, with an error naming the data. Filed as `F-25`. This form has no
         * parentheses and so cannot trip the heuristic; it is looser, and a rule that runs and is
         * approximate beats a rule that is exact and silently refuses everything.
         */
        turn: { type: 'string', required: true, pattern: '^D[0-9]+:[0-9,:D]*$' },
        speaker: { type: 'string', required: true },
        statedOn: { type: 'date', required: true },
        turns: { type: 'number', required: true, minimum: 1 },
      },
    },
  },
};

export const WINDOW_SIZE = Number(process.env['BENCH_WINDOW_SIZE'] ?? 5);
export const WINDOW_STEP = Number(process.env['BENCH_WINDOW_STEP'] ?? 2);

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
    const turns = session.turns;
    const day = session.startsAt.slice(0, 10);

    for (let i = 0; i < turns.length; i += WINDOW_STEP) {
      const window = turns.slice(i, i + WINDOW_SIZE);
      if (window.length === 0) break;

      /*
       * The text is the turns as they were said, one per line, speaker-prefixed — the same shape S0 gives a
       * single turn, so a window of one would embed identically to S0's record for that turn. That is what
       * keeps this comparable rather than a different corpus wearing the same name.
       */
      const fact = window.map(t => `${t.speaker}: ${t.text}`).join('\n');

      await ythril.writeMemory(space, {
        fact,
        type: 'utterance',
        properties: {
          session: session.index,
          // EVERY turn this record covers, comma-joined. The scorer splits on the comma, so retrieving this
          // record counts as retrieving each turn in it — which is the whole claim the rung makes, and the
          // reason the report must show turns-covered beside records-returned.
          turn: window.map(t => t.id).join(','),
          speaker: [...new Set(window.map(t => t.speaker))].join(','),
          statedOn: day,
          turns: window.length,
        },
      });
      records++;

      // The last window is short rather than absent: stopping when a full window no longer fits would drop
      // the tail of every session, and the end of a conversation is where its conclusions are.
      if (i + WINDOW_SIZE >= turns.length) break;
    }
  }

  return { records, modelCalls: 0 };
}
