/**
 * Rung S0F — the conversation taken apart into the product's own four kinds, deterministically.
 *
 * ## What this is
 *
 * Owner's instruction, 2026-09-06: *"deconstruct if you can deterministically as much as possible. everything
 * thats a thing or person can be an entity and every relation can be an edge with or without extra properties
 * and events are chronos and memories are facts and memories."*
 *
 * Every rung before this one stored ONE kind of record and argued about its shape. This stores all four, the
 * way the product is meant to be used:
 *
 * | the conversation contains | becomes |
 * |---|---|
 * | the two people talking | an **entity** each |
 * | a thing they keep coming back to | an **entity** |
 * | somebody saying something | a **memory** — the window of turns, unchanged from `S0W` |
 * | two things talked about together | an **edge**, carrying how often and in which sessions |
 * | a conversation happening on a date | a **chrono** entry |
 *
 * **No model, anywhere.** Every one of those comes out of the text by a rule: who spoke is in the source, when
 * they spoke is in the source, and what is a thing worth naming is decided by distribution (see `linkTerms`).
 * The ingest still cannot see a question.
 *
 * ## Why this is the rung the ladder was climbing towards
 *
 * The measurements so far say two things that only make sense together. Windowing wins because a coherent
 * chunk RANKS well: 50.8% of questions get the right answer first, against 31.7% for one turn per record.
 * And `S0E` — everything about one subject concatenated into a record — is the worst thing in the folder at
 * 10.6%, because a record holding twelve unrelated statements is close to every query and useful to none.
 *
 * Put together: **a record should be one coherent thing, and what relates it to another record belongs
 * outside the record.** That is not a benchmarking trick, it is the shape of a graph, and it is what this
 * product is. This rung is the first that tests it as designed rather than as approximated.
 *
 * ## What must be true for it to pay, and what it costs
 *
 * A walk is charged against the same answer budget as everything else: a match is counted with its whole
 * expansion, so every neighbour returned costs a window that would otherwise have come back. So the graph has
 * to be RIGHT, not merely present — a walk that returns three related-but-irrelevant records is strictly
 * worse than no walk, and the earlier runs show exactly that happening.
 *
 * The cost is visible in the report rather than argued here: `mean records`, `mean turns covered` and
 * `top record chars` sit beside the score, and the traverse-0 row for this same corpus is the control.
 *
 * ## Structure is never embedded, and the reason is a measured one
 *
 * Every entity, edge and chrono type is declared `suppressEmbeddings` in the schema below. They are hops,
 * not statements. An embedded edge competes for a ranked slot against the sentences that answer things, and
 * suppressing it removes nothing from the graph, because a traverse reads links and edges rather than
 * vectors.
 *
 * **Declared on the TYPE rather than per record**, which is one statement instead of a flag on every write —
 * and the client implements a per-record flag as a POST followed by a PATCH, so this also halves the
 * requests for the structural half of the corpus against a rate-limited instance.
 *
 * **A link does NOT cost the linked record's ranking, and three other rungs in this folder say it does.**
 * `memoryEmbedText` builds its text from the fact, the tags, the description and the properties;
 * `entityIds` is not among them (`brain/embed-text.ts`). An earlier version of this experiment did lose six
 * points to linking — because it stored the linked terms in a `properties` field for debugging, and
 * properties ARE embedded. The lesson is in the memory write below.
 */
export const rung = 's0f';
export const recallTypes = ['memory'];
export const needsModel = false;

/** The walk has to come back out to the other memories, or this rung measures its own seed. */
export const traverseExtra = { includeMemories: true, includeChrono: true };

/**
 * Hop 1 is memory to entity; hop 2 is the entity back out to the memories that also name it. Run at depth 1
 * the walk stops at the entity and not one extra turn is returned — a run that completes, looks healthy, and
 * reports on an experiment that did not happen. The runner refuses rather than producing that number.
 */
export const minTraverseDepth = 2;

/**
 * What this corpus may contain, declared to the instance rather than left to the ingest to get right.
 *
 * ## Why a benchmark wants this more than an application does
 *
 * A space defaults to `validationMode: 'strict'`, and the keys of each collection below are an ALLOWLIST.
 * With this declared, a write of an undeclared type is a 400, a `required` property that is missing is a
 * 400, and an edge whose ends are the wrong kind of thing is a 400.
 *
 * Without it, strict mode validates NOTHING — there is no rule for an undeclared type, so there is nothing
 * to violate, and every malformed record is accepted. That is how every rung in this folder ran until now.
 *
 * **An application notices a broken corpus because something throws. A benchmark notices nothing, because a
 * benchmark's output is a number.** A corpus missing a field scores low and reads as a finding about
 * retrieval, which is the most expensive kind of wrong available here — and it has happened twice in one
 * afternoon. Declaring the shape moves that failure from the report to the first write.
 *
 * ## `suppressEmbeddings` moves here, and it is not only tidiness
 *
 * Structure is a hop, not a sentence: an embedded edge competes for a ranked slot against the text that
 * answers things. Every rung so far suppressed per record, which the client implements as a POST followed by
 * a PATCH — two requests for every entity and every edge, against a rate-limited instance, and a step any
 * new rung can forget. Declared on the type it is one statement, it applies to records nobody remembered,
 * and it halves the writes for the structural half of the corpus.
 */
export const typeSchemas = {
  entity: {
    /*
     * The people. `namingPattern` is deliberately loose — a participant's name is whatever the source says
     * it is, and a stricter rule would encode this dataset's naming into the harness.
     */
    person: {
      propertySchemas: {},
      suppressEmbeddings: true,
    },
    /*
     * The things. The pattern is the extractor's own rule written where the instance can enforce it: four or
     * more lower-case letters. When that regex was silently corrupted into one matching a control character,
     * the ingest wrote five entities instead of 334 and the run reported a plausible number — a `namingPattern`
     * would not have caught the emptiness, but it does catch the opposite failure, which is the extractor
     * admitting `Taking`, `Any` and `Hey` as things.
     */
    thing: {
      namingPattern: '^[a-z]{4,}$',
      propertySchemas: {
        sessions: { type: 'number', required: true, minimum: 2 },
      },
      suppressEmbeddings: true,
    },
  },

  memory: {
    /*
     * What somebody said. `turn` is REQUIRED and patterned, and that is the single most valuable line here:
     * it is how a result is joined back to the answer key, so a rung that stops writing it does not score
     * badly, it scores ZERO — and a zero reads as "this strategy finds nothing" rather than as a bug.
     *
     * The pattern is one or more source ids, comma-joined, each `D<session>:<turn>`.
     */
    utterance: {
      propertySchemas: {
        session: { type: 'number', required: true, minimum: 1 },
        /*
         * NO GROUPS IN THIS PATTERN, and the reason is not style.
         *
         * The natural way to write "one or more `D<session>:<turn>` ids, comma-joined" is
         * `^D[0-9]+:[0-9]+(,D[0-9]+:[0-9]+)*$`. The instance refuses that pattern as a ReDoS risk — a
         * quantified group containing a quantifier — and `safeRegexTest` returns FALSE for a refused
         * pattern, which surfaces as `does not match pattern` against the value.
         *
         * So a perfectly correct record is rejected, permanently, with an error naming the DATA. Every
         * write fails, the message points away from the cause, and the schema that was supposed to protect
         * the corpus is the thing breaking it. Filed as `F-25`.
         *
         * This form has no parentheses, so the heuristic cannot fire. It is looser — it would accept
         * `D1:2:3` — and that is the trade: a rule that runs and is approximate beats a rule that is exact
         * and silently refuses everything.
         */
        turn: { type: 'string', required: true, pattern: '^D[0-9]+:[0-9,:D]*$' },
        speaker: { type: 'string', required: true },
        statedOn: { type: 'date', required: true },
        turns: { type: 'number', required: true, minimum: 1 },
      },
    },
  },

  edge: {
    /*
     * Two things the speakers discussed in the same breath. `endpoints` pins both ends to `thing`, so an
     * edge accidentally drawn from a person is refused rather than quietly making the graph mean something
     * else.
     */
    discussed_with: {
      endpoints: { from: ['thing'], to: ['thing'] },
      propertySchemas: {
        sessions: { type: 'number', required: true, minimum: 1 },
      },
      suppressEmbeddings: true,
    },
    /* Somebody returning to a subject. Directed, and the direction is the meaning: person -> thing. */
    talks_about: {
      endpoints: { from: ['person'], to: ['thing'] },
      propertySchemas: {
        sessions: { type: 'number', required: true, minimum: 1 },
      },
      suppressEmbeddings: true,
    },
  },

  chrono: {
    /*
     * A conversation happening on a date. `event` is one of the five built-in chrono types, so declaring it
     * here narrows rather than extends: with this map present, `deadline`, `plan`, `prediction` and
     * `milestone` become writes this corpus refuses.
     */
    event: {
      propertySchemas: {},
      suppressEmbeddings: true,
    },
  },
};

/** The memory shape, identical to `S0W`, so any difference between the two rungs is the graph and nothing else. */
export const WINDOW_SIZE = Number(process.env['BENCH_WINDOW_SIZE'] ?? 5);
export const WINDOW_STEP = Number(process.env['BENCH_WINDOW_STEP'] ?? 2);

/** A term is a thing worth naming only if it recurs, and only if it recurs in more than one session. */
export const MIN_MENTIONS = 3;
export const MIN_SESSIONS = 2;

/**
 * …and it stops being worth naming once it is everywhere.
 *
 * A term in most of the sessions joins most of the records to each other, so a walk from any match reaches a
 * large fraction of the corpus and the budget trims it to whichever neighbours happened to come first. That
 * is not a neighbourhood, it is a random sample wearing one.
 */
export const MAX_SESSION_SHARE = 0.5;

/** Terms one window may name. A cap on the walk's fan-out, not on the record's text — see the docblock. */
export const MAX_TERMS_PER_WINDOW = 3;

/**
 * The things worth naming — DERIVED from how they are distributed, not from a list and not from capitalisation.
 *
 * ## Two wrong answers came first, and they are why this is written this way
 *
 * **A stop list.** `S0E` filters capitalised words through eighty hand-written grammar words and still calls
 * *Taking*, *Any* and *Hey* subjects. Repairing the list means adding whatever this dataset capitalises, and
 * the same pass surfaces a participant's nickname — at which point the corpus has been shaped by looking at
 * the corpus. A list is also never finished and never obviously short.
 *
 * **A derived rule for the wrong property.** The next attempt kept a word only if it never appeared in lower
 * case — a clean test for *is this a proper name*, which produced five entities across 186 records and a walk
 * with nothing to walk. Proper names are not what these questions hinge on: *adoption*, *mentor*, *tattoo*
 * are ordinary nouns and they are exactly the joints. A rule can be perfectly derived and still answer a
 * question nobody asked.
 *
 * ## The property that actually matters
 *
 * **Distribution.** A thing worth naming appears in several sessions but not in most of them. In one session
 * it cannot bridge anything; in nearly all of them it joins everything to everything. That is document
 * frequency with a session as the document, and it needs no vocabulary — the words a stop list would hold are
 * excluded because they are everywhere, which is the same reason a stop list holds them. Nothing in it is
 * specific to English, to this dataset, or to any question.
 */
function linkTerms(conversation) {
  const sessionsWith = new Map();
  const totalOf = new Map();

  for (const session of conversation.sessions) {
    for (const turn of session.turns) {
      // Four letters and up. Shorter tokens are almost all function words, whose document frequency is high
      // enough to exclude them anyway, so this is a cost saving rather than a second rule.
      for (const m of turn.text.toLowerCase().matchAll(/\b([a-z]{4,})\b/g)) {
        const term = m[1];
        if (!sessionsWith.has(term)) sessionsWith.set(term, new Set());
        sessionsWith.get(term).add(session.index);
        totalOf.set(term, (totalOf.get(term) ?? 0) + 1);
      }
    }
  }

  const ceiling = conversation.sessions.length * MAX_SESSION_SHARE;
  const kept = new Map();
  for (const [term, sessions] of sessionsWith) {
    if ((totalOf.get(term) ?? 0) < MIN_MENTIONS) continue;
    if (sessions.size < MIN_SESSIONS) continue;
    if (sessions.size > ceiling) continue;
    kept.set(term, sessions.size);
  }
  return kept;
}

/** The terms a passage names, rarest first — the rarest discriminate, and the cap keeps those. */
function termsIn(text, kept) {
  const found = new Set();
  for (const m of text.toLowerCase().matchAll(/\b([a-z]{4,})\b/g)) {
    if (kept.has(m[1])) found.add(m[1]);
  }
  return [...found].sort((a, b) => (kept.get(a) - kept.get(b)) || a.localeCompare(b));
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

  // ── People ────────────────────────────────────────────────────────────────
  const personId = new Map();
  for (const name of conversation.speakers) {
    const created = await ythril.writeEntity(space, {
      name,
      type: 'person',
      description: 'A participant in this conversation.',
    });
    personId.set(name, created.id ?? created._id);
    records++;
  }

  // ── Things ────────────────────────────────────────────────────────────────
  const spread = linkTerms(conversation);
  const thingId = new Map();
  for (const [term, sessions] of [...spread].sort()) {
    const created = await ythril.writeEntity(space, {
      name: term,
      type: 'thing',
      properties: { sessions },
    });
    thingId.set(term, created.id ?? created._id);
    records++;
  }

  // ── What was said, and what it is about ───────────────────────────────────
  /*
   * Co-occurrence is counted while the windows are written and the edges are drawn afterwards, in one pass
   * per pair. Drawing an edge per window instead would POST the same (from, to, label) triple dozens of
   * times — an edge's identity is its endpoints and label, so the writes would merge and be correct, and the
   * ingest would spend most of its time re-writing the same handful of edges.
   */
  const pairSessions = new Map();   // "a|b" -> Set(session index)
  const spokeAbout = new Map();     // "person|term" -> Set(session index)

  for (const session of conversation.sessions) {
    const turns = session.turns;
    const day = session.startsAt.slice(0, 10);

    for (let i = 0; i < turns.length; i += WINDOW_STEP) {
      const window = turns.slice(i, i + WINDOW_SIZE);
      if (window.length === 0) break;

      const fact = window.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const named = termsIn(fact, spread).slice(0, MAX_TERMS_PER_WINDOW);
      const speakers = [...new Set(window.map(t => t.speaker))];

      await ythril.writeMemory(space, {
        fact,
        type: 'utterance',
        // The people who spoke and the things they spoke about. Free, in ranking terms: `entityIds` never
        // reaches the embedded text.
        entityIds: [
          ...speakers.map(s => personId.get(s)).filter(Boolean),
          ...named.map(t => thingId.get(t)),
        ],
        properties: {
          session: session.index,
          turn: window.map(t => t.id).join(','),
          speaker: speakers.join(','),
          statedOn: day,
          turns: window.length,
          /*
           * NOTHING ELSE GOES IN HERE, and the reason cost a whole comparison.
           *
           * `memoryEmbedText` takes the fact, the tags, the description and the PROPERTIES. A
           * `terms: "group,powerful,transgender"` field added here for debugging went straight into the
           * embedded text of every record, and the rung scored six points below the unlinked one before any
           * walk had run — which reads exactly like "linking is expensive", a conclusion about the product
           * drawn from a diagnostic field. The links are already the record of what this is about; anything
           * that wants them reads `entityIds`.
           */
        },
      });
      records++;

      for (let a = 0; a < named.length; a++) {
        for (let b = a + 1; b < named.length; b++) {
          const key = `${named[a]}|${named[b]}`;
          if (!pairSessions.has(key)) pairSessions.set(key, new Set());
          pairSessions.get(key).add(session.index);
        }
      }
      for (const who of speakers) {
        for (const term of named) {
          const key = `${who}|${term}`;
          if (!spokeAbout.has(key)) spokeAbout.set(key, new Set());
          spokeAbout.get(key).add(session.index);
        }
      }

      if (i + WINDOW_SIZE >= turns.length) break;
    }
  }

  // ── Relations, with what is known about them ──────────────────────────────
  for (const [key, sessions] of pairSessions) {
    const [a, b] = key.split('|');
    await ythril.writeEdge(space, {
      from: thingId.get(a),
      to: thingId.get(b),
      label: 'discussed_with',
      // The extra a relation can carry: how widely it holds. A pair that co-occurs across five sessions is a
      // real association; one that co-occurs once is a sentence that happened.
      properties: { sessions: sessions.size },
    });
    records++;
  }
  for (const [key, sessions] of spokeAbout) {
    const [who, term] = key.split('|');
    await ythril.writeEdge(space, {
      from: personId.get(who),
      to: thingId.get(term),
      label: 'talks_about',
      properties: { sessions: sessions.size },
    });
    records++;
  }

  // ── When it happened ──────────────────────────────────────────────────────
  for (const session of conversation.sessions) {
    await ythril.writeChrono(space, {
      title: `Conversation on ${session.startsAt.slice(0, 10)}`,
      startsAt: session.startsAt,
      type: 'event',
      entityIds: [...personId.values()],
    });
    records++;
  }

  return { records, modelCalls: 0 };
}
