/**
 * Rung S0E — one record per recurring subject, gathering what was said about it ACROSS sessions.
 *
 * ## The wall this exists to hit
 *
 * Windowing takes single-hop from 74% to 98% and leaves multi-hop at 46–57%, because the two failures are
 * different. A window fixes *"the reply is a separate record from the question"*. It cannot fix *"the evidence
 * is in session 3 and session 11"*, because a window never crosses a session boundary — and making one that
 * did would join unrelated text, which is worse than the problem.
 *
 * Multi-hop is 28 of 199 questions. Even at 100% everywhere else it caps the total near 94%, so it is the
 * ceiling rather than a rough edge.
 *
 * ## What this stores
 *
 * For every recurring capitalised subject — a name, a place, a thing the speakers keep returning to — one
 * record holding the turns that mention it, in order, from every session. A question that needs a turn from
 * session 3 and a turn from session 11 can be answered by ONE record if both mention the subject.
 *
 * Deterministic and model-free: capitalisation and frequency, nothing inferred. It still cannot see a
 * question.
 *
 * ## THE HOLE IN THE METRIC THIS RUNG COULD DRIVE THROUGH, AND WHY IT DOES NOT
 *
 * The scorer reads `properties.turn` and splits on commas, so a record naming a hundred turn ids counts as
 * having retrieved a hundred turns. A record that listed ids and carried NO TEXT would therefore score
 * perfectly and cost almost nothing — a term index wearing a memory's clothes, useless as an answer and
 * unbeatable on this number.
 *
 * So this rung stores the turns' TEXT, always, and is only ever measured under a fixed answer budget. Coverage
 * then costs bytes in proportion, and a record that reaches half the conversation crowds out everything else
 * rather than being free. **A benchmark whose metric can be satisfied without doing the work is not measuring
 * the work**, and the guard has to be in the experiment rather than in good intentions.
 *
 * `MAX_TURNS_PER_SUBJECT` is the second half of that guard: without it, the most common subject in a
 * conversation collects nearly every turn, which is the degenerate record described above arriving by
 * accident rather than by design.
 */
export const rung = 's0e';
export const recallTypes = ['memory'];
export const needsModel = false;

/** A subject must appear in at least this many turns to earn a record. Below it, the window rungs suffice. */
export const MIN_MENTIONS = 3;

/** …and in at least this many DIFFERENT sessions, because a single-session subject is what a window covers. */
export const MIN_SESSIONS = 2;

/** The cap that stops the most common subject becoming a record of the whole conversation. */
export const MAX_TURNS_PER_SUBJECT = 12;

/**
 * Words that are capitalised for grammar rather than because they name something.
 *
 * Sentence-initial capitals are the noise this has to survive: every turn starts with one, so without a stop
 * list the top subjects are "I", "The" and "It" — three records covering the entire conversation, which is
 * exactly the degenerate case the docblock above is about.
 */
const STOP = new Set([
  'I', 'A', 'An', 'The', 'It', 'He', 'She', 'They', 'We', 'You', 'My', 'Your', 'His', 'Her', 'Their', 'Our',
  'That', 'This', 'These', 'Those', 'There', 'Here', 'What', 'When', 'Where', 'Who', 'Why', 'How', 'Yes',
  'No', 'Yeah', 'Oh', 'Ah', 'Well', 'So', 'But', 'And', 'Or', 'If', 'Then', 'Now', 'Just', 'Really', 'Thanks',
  'Thank', 'Hi', 'Hey', 'Hello', 'Sorry', 'Sure', 'Okay', 'OK', 'Good', 'Great', 'Nice', 'Love', 'Its', 'Im',
  'Ive', 'Id', 'Ill', 'Dont', 'Thats', 'Whats', 'Lets', 'Maybe', 'Actually', 'Also', 'Not', 'Do', 'Did',
  'Have', 'Has', 'Had', 'Will', 'Would', 'Could', 'Should', 'Can', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been',
]);

/** Capitalised words that are not sentence-grammar. Deliberately crude — no model, no dictionary. */
function subjectsIn(text) {
  const out = new Set();
  for (const m of text.matchAll(/\b([A-Z][a-z]{2,})\b/g)) {
    if (!STOP.has(m[1])) out.add(m[1]);
  }
  return out;
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

  // ── Pass 1: which subjects recur, and where ───────────────────────────────
  const mentions = new Map();   // subject -> [{ turn, session, speaker, text, day }]
  for (const session of conversation.sessions) {
    const day = session.startsAt.slice(0, 10);
    for (const turn of session.turns) {
      for (const subject of subjectsIn(turn.text)) {
        if (!mentions.has(subject)) mentions.set(subject, []);
        mentions.get(subject).push({
          turn: turn.id, session: session.index, speaker: turn.speaker, text: turn.text, day,
        });
      }
    }
  }

  // ── Pass 2: a record per subject that clears both floors ──────────────────
  for (const [subject, all] of [...mentions].sort()) {
    const sessions = new Set(all.map(m => m.session));
    if (all.length < MIN_MENTIONS || sessions.size < MIN_SESSIONS) continue;

    /*
     * SPREAD, not the first N. Taking the earliest twelve mentions would bias every subject towards the start
     * of the conversation, and a multi-hop question is as likely to need the last mention as the first. An
     * even stride keeps both ends and the middle.
     */
    const stride = Math.max(1, Math.ceil(all.length / MAX_TURNS_PER_SUBJECT));
    const kept = all.filter((_, i) => i % stride === 0).slice(0, MAX_TURNS_PER_SUBJECT);

    await ythril.writeMemory(space, {
      // The subject leads, because it is what a query about it will match on, and the turns follow as the
      // evidence. This is the record's whole content — there is no id-only shortcut; see the docblock.
      fact: `About ${subject}:\n` + kept.map(m => `${m.speaker} (${m.day}): ${m.text}`).join('\n'),
      type: 'subject',
      properties: {
        subject,
        turn: kept.map(m => m.turn).join(','),
        sessions: [...sessions].sort((a, b) => a - b).join(','),
        mentions: all.length,
        covered: kept.length,
      },
    });
    records++;
  }

  return { records, modelCalls: 0 };
}
