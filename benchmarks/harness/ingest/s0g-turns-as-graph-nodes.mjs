/**
 * Rung S0G — the same turns, modelled so that the graph and the ranked search can actually meet.
 *
 * ## The finding this rung exists to test
 *
 * `recall`'s `traverse` expands from the ids of the records it matched, and `traverseFromSeeds` follows records
 * in the `_edges` collection. An edge's `from`/`to` are validated against the `_entities` collection
 * (`entity-refs.ts:assertRefsResolve`), so **a memory can never be an edge endpoint.**
 *
 * Put those together and a conclusion falls out that is easy to miss and expensive to assume away:
 *
 * > When recall matches a MEMORY, graph expansion has an empty frontier and contributes nothing — at any depth,
 * > with any narrowing, however rich the graph is.
 *
 * That was measured before it was read: rung S0+ at traverse depth 0, 1 and 2 returned byte-identical scores
 * and `graphNodes: 0`. A graph nothing can walk into is not a weak graph, it is an absent one.
 *
 * ## What this rung changes, and why it is a fair comparison rather than a trick
 *
 * The turns become **entities** rather than memories. Nothing else changes: same text, same properties, same
 * one-record-per-turn granularity, same ingestion cost, still no model call.
 *
 * The text they embed is near-identical too, which is what keeps the comparison honest.
 * `memoryEmbedText` puts `fact` then properties; `entityEmbedText` puts `name` then `type` then properties. So
 * a turn that embedded as
 *
 *     "Caroline: I ran the charity race today  session 5 turn D5:3 speaker Caroline statedOn 2023-05-08"
 *
 * now embeds as the same string with the word `utterance` after the sentence. That is a real difference and it
 * is reported rather than waved away — it is why S0G's traverse-0 number is quoted beside S0's, so a reader can
 * see the cost of the re-modelling separately from the benefit of the graph.
 *
 * ## The edges
 *
 * One per turn, to its session, and **deliberately not to its speaker.** With two participants every one of the
 * ~600 turns would hang off the same two nodes, so one hop from any match would reach the entire conversation —
 * not a neighbourhood but the whole corpus behind a node cap, where whichever neighbours the cap kept would be
 * indistinguishable from a deliberate answer. Sessions divide the same turns into ~19 groups of ~22, which is a
 * neighbourhood a hop can mean something about.
 *
 * `from` is the turn so a traversal runs outward from what recall matched. Reaching the session's OTHER turns is
 * a second hop, arriving inbound — which is why the sweep must run **depth 2**, and why direction is left at the
 * default rather than pinned to one way.
 *
 * ## This rung is a WORKAROUND, and it should be read as one
 *
 * Nothing about modelling a conversational turn as an `entity` is natural. It is done here for exactly one
 * reason: an edge's endpoints are validated against the entities collection, so a memory cannot be one, and
 * a rung that wants its records reachable by traversal has no other option today.
 *
 * That is a property of the store, not of this benchmark, and it is being fixed on its own merits —
 * `todo/_LINKS-AND-SCHEMA-PLAN.md`. **The dependency runs one way: the benchmark waits on the architecture,
 * never the reverse.** When links become first-class edges, this rung's justification disappears and it should
 * be re-modelled as memories with real edges, or deleted — leaving it in place afterwards would mean the
 * benchmark quietly measures a shape no user would choose.
 *
 * ## The question-blindness rule
 *
 * Conversation in, records out. No import here can reach the question set, and a gate enforces it.
 */
export const rung = 's0g';

/**
 * Its turns are ENTITIES, because only an entity can be an edge endpoint.
 *
 * Measured, not assumed: without this filter the suppressed `said_in` edges still take ranked slots. Suppressing
 * an embedding removes a record from the VECTOR channel and not from the lexical one, and hybrid search is on by
 * default — so a structural record with no embedding can still be returned by keyword match. Two of the top five
 * results in a seven-record smoke space were edges.
 */
export const recallTypes = ['entity'];
export const needsModel = false;

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

  // ── The sessions, as navigational nodes ───────────────────────────────────
  const sessionIds = new Map();
  for (const session of conversation.sessions) {
    const day = session.startsAt.slice(0, 10);
    const created = await ythril.writeEntity(space, {
      name: `Session ${session.index}`,
      type: 'session',
      properties: { session: session.index, startsOn: day, turns: session.turns.length },
      // Navigational, not a claim: an embedded "Session 7" would compete for a ranked slot with the sentences
      // that answer things. Suppressing the embedding does NOT remove it from the graph — traversal reads the
      // `_edges` collection, which is untouched by this flag.
      suppressEmbeddings: true,
    });
    sessionIds.set(session.index, created.id ?? created._id);
    records++;

    await ythril.writeChrono(space, {
      title: `Conversation session ${session.index}`,
      startsAt: session.startsAt,
      type: 'event',
      entityIds: [sessionIds.get(session.index), ...speakerIds.values()],
      properties: { session: session.index, startsOn: day },
    });
    records++;
  }

  // ── The turns, as entities so they can be edge endpoints ──────────────────
  for (const session of conversation.sessions) {
    const sid = sessionIds.get(session.index);
    for (const turn of session.turns) {
      const created = await ythril.writeEntity(space, {
        // The utterance IS the name, because the name is what leads the embedded text — the same position
        // `fact` holds for a memory. Putting it in `description` instead would push the sentence behind the
        // entity's type and make the two rungs embed differently for no reason a reader could defend.
        name: `${turn.speaker}: ${turn.text}`,
        type: 'utterance',
        properties: {
          session: session.index,
          turn: turn.id,
          speaker: turn.speaker,
          statedOn: session.startsAt.slice(0, 10),
        },
      });
      records++;

      await ythril.writeEdge(space, {
        from: created.id ?? created._id,
        to: sid,
        label: 'said_in',
        // A hop, not a sentence. ~600 embedded edges would evict the turns that carry the answers.
        suppressEmbeddings: true,
      });
      records++;
    }
  }

  return { records, modelCalls: 0 };
}
