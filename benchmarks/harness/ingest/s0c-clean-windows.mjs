/**
 * Rung S0C — the same windows as `S0W`, with the benchmark's bookkeeping taken out of the records.
 *
 * ## What was in the corpus that should never have been
 *
 * A memory's embedded text is built from its fact, its tags, its description and its PROPERTIES — key and
 * value, joined with spaces (`brain/embed-text.ts`). Every rung in this folder stores which source turns a
 * record covers as `properties.turn`, because that is what the scorer reads. So the text actually being
 * ranked, for every record in every corpus measured so far, ends:
 *
 * ```text
 * …session 3 turn D3:1,D3:2,D3:3,D3:4,D3:5 speaker Caroline,Melanie statedOn 2023-06-27 turns 5
 * ```
 *
 * Roughly twenty tokens, on every record, most of them identifiers that mean nothing to anybody. It is the
 * same shape everywhere, so it does not favour one record over another — it simply dilutes all of them, and
 * a diluted vector is a blunter one.
 *
 * **Nobody decided this.** It is the answer-joining metadata of the measurement, sitting inside the thing
 * being measured. No deployment would store a list of turn identifiers on a memory, so a corpus that carries
 * them is not the corpus the product would have.
 *
 * ## What this rung changes, and it is only this
 *
 * The record holds the conversation and nothing else. Which turns it covers is reported to the client as
 * `covers`, stripped before the write, and kept in a map the runner joins on afterwards by record id.
 *
 * Everything else is byte-identical to `S0W`: same window size, same step, same text, same order, no model,
 * still blind to the questions. So the difference between the two rungs is the property noise and nothing
 * else, which is what makes it worth a row.
 *
 * ## Why the speaker and the date go too, when those at least mean something
 *
 * They are real facts, and they are already in the text: every line of the window begins with the speaker's
 * name. The date is not, and dropping it costs nothing measurable — the rung that put the date INTO the text
 * where it would actually be matched moved the whole set by zero. What is left is a property block that adds
 * tokens and no information, and the honest version of "keep the useful metadata" is to write it into the
 * fact where a reader would see it, not into a field that gets appended to the vector.
 */

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
     * NO PROPERTIES, and that is the whole rung. A memory's embedded text includes its properties, key and
     * value, so the turn ids every other strategy stores are a dozen meaningless tokens inside every vector.
     * Here the coverage is reported to the client and kept outside the corpus, so the record holds the
     * conversation and nothing else — and the schema says so, which is what makes it enforceable.
     */
    utterance: { propertySchemas: {} },
  },
};

export const rung = 's0c';
export const recallTypes = ['memory'];
export const needsModel = false;

/**
 * The runner refuses `--reuse-spaces` for this rung.
 *
 * The coverage map is built while ingesting. Against a space this process did not write, it is empty, every
 * question scores zero, and the run completes and reports that the strategy finds nothing — a wrong number
 * rather than a low one.
 */
export const coversOutOfBand = true;

/** Identical to `S0W`, from the same environment variables, so the two are the same corpus but for the noise. */
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

    for (let i = 0; i < turns.length; i += WINDOW_STEP) {
      const window = turns.slice(i, i + WINDOW_SIZE);
      if (window.length === 0) break;

      await ythril.writeMemory(space, {
        fact: window.map(t => `${t.speaker}: ${t.text}`).join('\n'),
        type: 'utterance',
        // Stripped before the POST and recorded against the created id. Never stored, never embedded.
        covers: window.map(t => t.id),
      });
      records++;

      // A short last window rather than none: stopping when a full one no longer fits drops the tail of
      // every session, and the end of a conversation is where its conclusions are.
      if (i + WINDOW_SIZE >= turns.length) break;
    }
  }

  return { records, modelCalls: 0 };
}
