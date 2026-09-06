/**
 * The schema pieces the ingest strategies share, so a rule is written once rather than eleven times.
 *
 * ## Why a shared module instead of a copy per strategy
 *
 * The strategies are variations on a few shapes: most write turns as memories, several add the same
 * structural entities, and the ones that differ do so in one field. Copied per file, the shared parts would
 * drift the way every duplicated rule in this repository has drifted — and the copy that goes wrong is not
 * the one anybody reads.
 *
 * A strategy composes what it needs and states its own difference next to it, which keeps the difference
 * where a reader is looking for it.
 *
 * ## The one pattern in here, and why it is written badly on purpose
 *
 * `TURN_IDS` should be `^D[0-9]+:[0-9]+(,D[0-9]+:[0-9]+)*$` — one or more `D<session>:<turn>` ids, joined by
 * commas. The instance refuses that pattern as a ReDoS risk (a quantified group containing a quantifier) and
 * **reports the refusal as `does not match pattern` against the value**, so every correct record is rejected,
 * permanently, with an error naming the data. Filed as `F-25`.
 *
 * The form here has no parentheses, so the heuristic cannot fire. It is looser — it would accept `D1:2:3` —
 * and that is the trade: a rule that runs and is approximate beats a rule that is exact and refuses
 * everything.
 */

/** One or more source turn ids, comma-joined. No groups — see above. */
export const TURN_IDS = '^D[0-9]+:[0-9,:D]*$';

/**
 * The properties a record of conversation turns carries.
 *
 * `turn` is the one that matters most and it is `required`: it is how a result is joined back to the answer
 * key, so a strategy that stops writing it does not score badly, it scores ZERO — and a zero reads as "this
 * strategy finds nothing" rather than as a bug.
 */
export const TURN_PROPERTIES = {
  session: { type: 'number', required: true, minimum: 1 },
  turn: { type: 'string', required: true, pattern: TURN_IDS },
  speaker: { type: 'string', required: true },
  statedOn: { type: 'date', required: true },
};

/** …plus how many turns the record covers, for the strategies that group them. */
export const WINDOW_PROPERTIES = {
  ...TURN_PROPERTIES,
  turns: { type: 'number', required: true, minimum: 1 },
};

/**
 * The structural entities several strategies write: the speakers, and the sessions turns hang off.
 *
 * All declared `suppressEmbeddings`, because they are hops rather than statements — an embedded "Session 7"
 * competes for a ranked slot against the sentences that answer things, and suppressing it removes nothing
 * from the graph, since a traverse reads links and edges rather than vectors.
 *
 * **Declared on the TYPE rather than per record.** The client implements a per-record flag as a POST followed
 * by a PATCH, so stating it here halves the requests for the structural half of a corpus — and it applies to
 * records a future strategy forgets to flag.
 */
export const STRUCTURE_ENTITIES = {
  person: { propertySchemas: {}, suppressEmbeddings: true },
  session: {
    propertySchemas: {
      session: { type: 'number', required: true, minimum: 1 },
      startsOn: { type: 'date', required: true },
      turns: { type: 'number', required: true, minimum: 0 },
    },
    suppressEmbeddings: true,
  },
};

/** A conversation session as a point in time. `event` is one of the five built-in chrono types. */
export const SESSION_CHRONO = {
  event: { propertySchemas: {}, suppressEmbeddings: true },
};
