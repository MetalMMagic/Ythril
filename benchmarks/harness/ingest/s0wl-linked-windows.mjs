/**
 * Rung S0WL — the windows of S0W, joined across sessions by a LINK rather than by concatenation.
 *
 * ## The one wall that has not moved, and why the obvious fix made things worse
 *
 * Multi-hop is 0.0% at rank 1 for every rung measured so far — 28 of 199 questions, and the ceiling that keeps
 * the total at 85.9% rather than 100%. Those questions need a turn from one conversation and a turn from
 * another, weeks apart. No single window holds both, because a window never crosses a session boundary.
 *
 * `S0E` tried the direct fix: put everything said about a recurring subject into ONE record, across sessions.
 * It scored **10.6%** at rank 1 while reaching more of the conversation than anything else — the worst result
 * in the folder. The reason is worth stating because it is what this rung is designed around: a record holding
 * twelve unrelated statements has no subject in the sense a query has one, so its embedding sits near
 * everything and therefore near nothing. **Concatenating text that belongs together conceptually destroys the
 * thing that made it findable.**
 *
 * ## What this does instead
 *
 * The record stays a window — coherent, one exchange, the shape that ranks best. The cross-session
 * relationship is expressed as a **link** to a shared subject entity, which is what the product is for. A
 * match on a window in session 3 walks to the subject and back out to the window in session 11 that mentions
 * it, and the second window arrives intact rather than averaged into the first.
 *
 * So the ranking signal and the relationship are carried by different mechanisms, which is the whole
 * architectural claim: *"a search that matches a memory is no longer a dead end."* This rung is that claim
 * with a number attached.
 *
 * ## IT MUST BE RUN AT `--traverse 2`, AND DEPTH 1 SILENTLY MEASURES NOTHING
 *
 * A matched memory has no edges of its own, so hop 1 is memory → subject entity. Coming back out to the other
 * windows is hop 2. Run at depth 1 the walk reaches the entity and stops: every result carries exactly one
 * graph node, that node is the subject itself, and **not one additional turn is returned.**
 *
 * The reason this needs saying in capitals is that it does not look like a failure. The response is
 * well-formed, `_graph` is non-empty so the walk plainly ran, and the score comes back a plausible number
 * near the unlinked rung's. A first run of this rung was launched at depth 1 and would have reported "linking
 * does not help multi-hop" — a true-looking conclusion about an experiment that never happened. `S0L`'s
 * docblock warns about this in as many words, and it was still walked into.
 *
 * ## Why this is not the coverage cheat wearing a graph
 *
 * It is a fair question, because a walk does return more records. Three things hold it honest, and the first
 * is the one that matters:
 *
 * 1. **Expansion is charged against the same byte budget.** A recall's answer is trimmed to `maxChars` with a
 *    match counted together with its whole `_graph` subtree, so every linked window admitted costs a window
 *    that would otherwise have been returned. Measured at a fixed budget, a walk that brings back noise
 *    scores WORSE, and an earlier traverse-2 run did exactly that — mean records collapsed from 20 to 5 and
 *    the score fell with it.
 * 2. **The link is a relationship, not padding.** Two windows are joined because both name the same subject.
 *    That is a claim about the conversation which is either true or false, and it is derived from the text
 *    rather than from the answer key.
 * 3. **The report still prints what the first result cost.** `top record chars` and `mean records` sit beside
 *    the score, so a walk that returns half the transcript is visible as one.
 *
 * ## Subjects: a DERIVED rule, and what that costs the comparison against `S0E`
 *
 * `S0E` finds its subjects with a hand-written list of capitalised grammar words, and that list does not
 * work — its top subjects include *Taking*, *Any* and *Hey*. This rung derives the rule instead: a word that
 * appears in several sessions but not in most of them is a joint worth linking on. See `linkTerms`.
 *
 * **So the two rungs differ in TWO things, and that is a real weakness of this comparison**, stated here
 * rather than left for a reader to work out. If this rung wins, the gain could be the linkage or the better
 * subjects. The alternative was to keep an extractor already shown not to work, which would have tested
 * linkage over noise and answered a question nobody asked. The `s0wl` traverse-0 control isolates what the
 * subjects alone did to the ranking; separating them further needs `S0E` re-run with the derived rule, which
 * is its own row rather than a claim made here.
 *
 * The floors matter more here than they did there. A subject appearing in one session cannot produce a
 * cross-session hop, and a subject appearing in every session links everything to everything, which is a walk
 * that reaches the whole corpus and gets trimmed to noise by the budget.
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
    utterance: { propertySchemas: WINDOW_PROPERTIES },
  },
  entity: {
    /*
     * A term worth joining two windows on. The naming pattern is the extractor's own rule, written where the
     * instance can enforce it: four or more lower-case letters. It catches the failure that matters — an
     * extractor admitting `Taking`, `Any` and `Hey` as subjects.
     */
    subject: {
      namingPattern: '^[a-z]{4,}$',
      propertySchemas: { sessions: { type: 'number', required: true, minimum: 2 } },
      suppressEmbeddings: true,
    },
  },
};

export const rung = 's0wl';
export const recallTypes = ['memory'];
export const needsModel = false;

/** Returning the linked windows is opt-in on the server, and without it this rung measures nothing. */
export const traverseExtra = { includeMemories: true };

/**
 * The shallowest walk at which this rung measures anything, enforced by the runner rather than remembered.
 *
 * Hop 1 is memory to subject entity; hop 2 is the entity back out to the other windows. At depth 1 the
 * response is well-formed, `_graph` is non-empty, and no additional turn is returned — a run that looks
 * completed and answered a different question. The runner refuses rather than producing that number.
 */
export const minTraverseDepth = 2;

/** Same shape as `S0W`, from the same environment variables, so the two differ only in the linking. */
export const WINDOW_SIZE = Number(process.env['BENCH_WINDOW_SIZE'] ?? 5);
export const WINDOW_STEP = Number(process.env['BENCH_WINDOW_STEP'] ?? 2);

/** A subject earns an entity only if it recurs, and only if it recurs in more than one session. */
export const MIN_MENTIONS = 3;
export const MIN_SESSIONS = 2;

/**
 * …and it stops being a useful link once it is everywhere.
 *
 * A subject named in most of the sessions joins most of the windows to each other, so a walk from any match
 * reaches a large fraction of the corpus and the budget trims it to whichever neighbours happened to come
 * first. That is not a neighbourhood, it is a random sample wearing one — the same failure the session-only
 * decision in `S0L` was taken to avoid.
 */
export const MAX_SESSION_SHARE = 0.5;

/**
 * How many terms one window may link to.
 *
 * **Not a ranking concern, contrary to what this comment said first.** A link does not touch the embedded
 * text: `memoryEmbedText` reads the fact, the tags, the description and the properties, and `entityIds` is
 * none of those (`brain/embed-text.ts`). Two other rungs in this folder repeat the same wrong claim, inherited
 * from `S0+`'s note that linking cost it 1.5 points — whatever produced that number, this is not the
 * mechanism, and it should be re-measured rather than quoted.
 *
 * The cap is about the WALK. Every link is an edge out of this record, so an uncapped window joins itself to
 * everything its five turns happen to mention, and a walk from it reaches a neighbourhood that is large,
 * arbitrary, and then trimmed by the byte budget to whichever part came back first.
 */
export const MAX_SUBJECTS_PER_WINDOW = 3;

/**
 * The terms worth joining two windows on — DERIVED from how they are distributed, not listed and not named.
 *
 * ## Two wrong answers came before this one, and both are the reason it is written this way
 *
 * **First a stop list.** `S0E` filters capitalised words through about eighty hand-written grammar words, and
 * its top subjects are still *Taking*, *Any* and *Hey*. Repairing the list means adding whatever this dataset
 * happens to capitalise, and the same pass surfaces *Mel*, a participant's nickname here — at which point the
 * corpus has been shaped by looking at the corpus. A list is also never finished and never obviously short.
 *
 * **Then a derived rule that was derived for the wrong property.** The replacement kept a word only if it
 * never appeared in lower case anywhere — a clean test for *is this a proper name*. It produced **five**
 * entities across 186 windows, and the walk built on them returned nothing at all, because proper names are
 * not what these questions hinge on. *Adoption*, *mentor*, *tattoo* are ordinary nouns and they are exactly
 * the joints a multi-hop question turns on. A rule can be perfectly derived and still answer a question
 * nobody needed answered.
 *
 * ## What actually distinguishes a joint
 *
 * Not capitalisation — **distribution.** A term worth linking on appears in SEVERAL sessions but not in most
 * of them:
 *
 * - in one session only, it cannot produce a cross-session hop at all;
 * - in nearly every session — *that*, *think*, *really*, and the participants' own names — it joins everything
 *   to everything, and a joint connecting the whole corpus carries no information about any part of it.
 *
 * That is document frequency, with a session as the document, and it needs no vocabulary: the words a stop
 * list would have held are excluded because they are everywhere, which is the same reason a stop list holds
 * them. Nothing here is specific to English, to this dataset, or to any question.
 */
function linkTerms(conversation) {
  const sessionsWith = new Map();   // term -> Set(session index)
  const totalOf = new Map();        // term -> occurrences

  for (const session of conversation.sessions) {
    for (const turn of session.turns) {
      // Four letters and up: shorter tokens are almost all function words, and they are the ones whose
      // document frequency is high anyway, so this is a cost saving rather than a second rule.
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

/** The terms a window names, rarest first — the rarest are the ones that discriminate when the cap bites. */
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

  // ── Pass 1: the terms that join sessions together ─────────────────────────
  const spread = linkTerms(conversation);   // term -> how many sessions name it

  const keep = new Map();   // term -> entity id
  for (const [term, sessions] of [...spread].sort()) {
    const created = await ythril.writeEntity(space, {
      name: term,
      type: 'subject',
      properties: { sessions },
      /*
       * The entity is a JOINT, not a statement. Embedded, a bare subject name competes for a ranked slot
       * against the sentences that actually answer things — and suppressing it removes nothing from the
       * graph, because a traverse reads links rather than vectors.
       */
      suppressEmbeddings: true,
    });
    keep.set(term, created.id ?? created._id);
    records++;
  }

  // ── Pass 2: the windows of S0W, each linked to the subjects it names ──────
  for (const session of conversation.sessions) {
    const turns = session.turns;
    const day = session.startsAt.slice(0, 10);

    for (let i = 0; i < turns.length; i += WINDOW_STEP) {
      const window = turns.slice(i, i + WINDOW_SIZE);
      if (window.length === 0) break;

      const fact = window.map(t => `${t.speaker}: ${t.text}`).join('\n');

      // Rarest first, so when the cap bites it keeps the terms that discriminate and drops the vague ones.
      // Taking the first three in reading order would keep whichever happened to be said earliest, which is
      // not a property of anything.
      const named = termsIn(fact, spread).slice(0, MAX_SUBJECTS_PER_WINDOW);

      await ythril.writeMemory(space, {
        fact,
        type: 'utterance',
        ...(named.length > 0 ? { entityIds: named.map(s => keep.get(s)) } : {}),
        properties: {
          session: session.index,
          turn: window.map(t => t.id).join(','),
          speaker: [...new Set(window.map(t => t.speaker))].join(','),
          statedOn: day,
          turns: window.length,
          /*
           * The linked terms are DELIBERATELY NOT stored as a property, and this is the trap that made a
           * whole comparison invalid before it was caught.
           *
           * `entityIds` never reaches the text that gets embedded — `memoryEmbedText` takes the fact, the
           * tags, the description and the PROPERTIES, and nothing else (`brain/embed-text.ts`). So linking a
           * record costs its ranking nothing. But a `subjects: "group,powerful,transgender"` property added
           * here for diagnostics went straight into the embedded text of every record, and the rung scored
           * six points below the unlinked one BEFORE any walk had happened. That reads exactly like
           * "linking is expensive", which is a conclusion about the product, drawn from a debugging field.
           *
           * The links are already the record of what a window is about. Anything that wants to see them can
           * read `entityIds`, which is what a walk does.
           */
        },
      });
      records++;

      if (i + WINDOW_SIZE >= turns.length) break;
    }
  }

  return { records, modelCalls: 0 };
}
