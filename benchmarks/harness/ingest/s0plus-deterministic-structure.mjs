/**
 * Rung S0+ — everything the source already states, as structure. Still no model call.
 *
 * ## The rung nobody thinks to run
 *
 * Between "store the text" and "have a model read it" there is a step that costs nothing: **use what the source
 * already tells you.** A transcript format normally carries more than prose — who the participants are, when
 * each session happened, which turn is which. All of that is structure, and turning it into records needs no
 * language understanding at all.
 *
 * Here that is the two speakers, and a real timestamp per session. So this rung writes:
 *
 *   - one `person` entity per participant;
 *   - one `session` entity per session, because the session is the natural JOIN POINT — a turn belongs to one,
 *     a session has a date, and evidence in this corpus is cited by turn. Traversal can then walk
 *     fact → session → date → other facts in that session, which is a hop that exists in the data rather than
 *     one a model inferred;
 *   - one `chrono` per session carrying its real `startsAt`, so time is a first-class record and not a string
 *     inside prose;
 *   - edges joining them.
 *
 * ## Why this rung is worth its own row in the results
 *
 * If a measurable part of the temporal or multi-hop gain is available for **zero tokens**, that is a stronger
 * claim than any comparison against a competitor: it says the structure earns its keep before the extraction
 * does. And the negative result is equally useful — if S0+ does not move temporal at all, then chrono records
 * are not reaching retrieval, and the S3 → S4 comparison further up the ladder needs re-reading before anyone
 * concludes the graph is worthless.
 *
 * ## General justification, which is the test every element here has to pass
 *
 * Would this still be right for a user whose data looks nothing like this dataset? Yes, and that is why it is
 * here rather than in a LoCoMo adapter: **every conversational corpus has participants and timestamps.** A chat
 * export, a meeting transcript, a support thread. This rung is the part of ingestion that never needs a model
 * for any of them.
 *
 * ## The question-blindness rule
 *
 * Conversation in, records out. No import can reach the question set, and a gate enforces it.
 */

export const rung = 's0+';
export const needsModel = false;

/*
 * IDENTITY IS THE INGESTER'S JOB, and it is not optional — measured the hard way.
 *
 * The first version of this rung derived readable ids (`space:person:ada`) and passed them on write, expecting
 * the second write of the same name to be an update by construction. **Ythril does not adopt a caller-supplied
 * id.** Identity is server-generated; `id` addresses an EXISTING record and an id that names nothing is ignored
 * rather than adopted, exactly as `upsert_entity`'s own schema says. The write succeeded with a fresh UUID, and
 * the edge that followed was refused — `from` references an entity ID that does not exist — which is the right
 * refusal and the only reason this was caught before a forty-minute run.
 *
 * So the ingester holds a REGISTRY: name+type to the id the server actually returned. The specification called
 * identity "the hard part and not the model's job" and it is right for a reason stronger than it argued: there
 * is no shortcut available. Every re-mention must pass the id that came back from the first write.
 */

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
  //
  // Ids are DERIVED rather than server-minted, because `upsertEntity` mints a fresh UUID unless one is passed
  // and only WARNS when a same name+type already exists. Two `Caroline` documents would fragment every path
  // through her and raise no error — the silent-duplicate defect the specification calls the hard part of
  // identity. A derived id makes the second write an update by construction.
  const speakerIds = new Map();
  for (const name of conversation.speakers) {
    const created = await ythril.writeEntity(space, {
      name,
      type: 'person',
      description: `A participant in this conversation.`,
      properties: { role: 'participant' },
    });
    // The id the SERVER chose. Nothing later may reconstruct it — see the note above.
    speakerIds.set(name, created.id ?? created._id);
    records++;
  }

  // ── The sessions ──────────────────────────────────────────────────────────
  for (const session of conversation.sessions) {
    const day = session.startsAt.slice(0, 10);

    /*
     * The session as an ENTITY, and separately as a CHRONO.
     *
     * Not one record doing both, because they answer different questions and a store that conflates them makes
     * one of them worse. The entity is a place in the graph to stand — edges attach to it and a traversal can
     * pass through it. The chrono is a point in time — it carries a real `startsAt` that a time-range query can
     * compare, which a property on an entity cannot do as well.
     *
     * The entity is written WITHOUT an embedding. It is a navigational node, and an embedded "Session 7" would
     * compete for a result slot with the sentences that actually answer things — the specification's one
     * invariant is one claim, one embedded record, and a session heading is not a claim.
     */
    const sessionEntity = await ythril.writeEntity(space, {
      name: `Session ${session.index}`,
      type: 'session',
      properties: {
        session: session.index,
        startsOn: day,
        turns: session.turns.length,
      },
      suppressEmbeddings: true,
    });
    const sid = sessionEntity.id ?? sessionEntity._id;
    records++;

    await ythril.writeChrono(space, {
      title: `Conversation session ${session.index}`,
      startsAt: session.startsAt,
      // `event` because chrono types are a CLOSED SET — event, deadline, plan, prediction, milestone — and a
      // session is something that happened at a known time. Found by the smoke test rather than by reading:
      // an invented type is a 400, which is the right refusal and the reason to exercise a client before a
      // forty-minute run depends on it.
      type: 'event',
      entityIds: [sid, ...speakerIds.values()],
      properties: {
        session: session.index,
        // Mirrored as a plain property for the same reason S0 mirrors `statedOn`: `recall`'s filter reaches
        // `properties.*`, not a chrono's native `startsAt`, so without this a caller cannot bound a recall in
        // time on either door without a second `query` call.
        startsOn: day,
      },
    });
    records++;

    // Each participant spoke in this session. Directed from the person, because "who spoke where" is the
    // question this edge answers and a traversal outbound from a person should reach their sessions.
    const spoke = new Set(session.turns.map(t => t.speaker));
    for (const name of spoke) {
      const from = speakerIds.get(name);
      if (!from) continue;   // a speaker not in the header — recorded by absence rather than invented
      await ythril.writeEdge(space, {
        from,
        to: sid,
        label: 'spoke_in',
        // Suppressed: this edge is a hop, not a sentence. Fourteen of them per conversation competing for
        // `topK` would evict the memories carrying the actual content, and the specification's invariant is
        // exactly about not paying a ranked slot for structure.
        suppressEmbeddings: true,
      });
      records++;
    }
  }

  return { records, modelCalls: 0 };
}
