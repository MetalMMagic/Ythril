/**
 * The BLIND judge — one call grades every system's answer to one question, unlabelled.
 *
 * ## What blindness buys, and why it is nearly free
 *
 * `benchmarks/PROTOCOL.md` §Grading: the judge never learns which system produced which answer. Every candidate
 * for a question is shuffled into an anonymous numbered list, graded in a single call, and re-labelled from the
 * shuffle map afterwards. It costs one hash and a Fisher-Yates pass, and it removes the most obvious way a
 * grader's opinion of a system leaks into a system's score. Almost no published comparison does it, which is
 * exactly why it is worth doing here.
 *
 * Grading all candidates together is the same measurement for a fraction of the calls, and it is strictly better
 * judging: the candidates are compared against each other rather than each against the grader's mood on a
 * different call. The rejected alternative — one call per candidate — costs `systems ×` the calls AND makes the
 * verdicts non-comparable, so it was worse on both axes.
 *
 * ## The judge never sees the retrieved context
 *
 * Only the question, the gold answer and the candidates. Showing it the context invites it to grade the
 * retrieval instead of the answer — a candidate whose context obviously contained the fact reads as more
 * credible even when the sentence it produced is wrong, and that is a retrieval score wearing an answer score's
 * name. There is deliberately no parameter here through which context could be passed.
 *
 * ## The shuffle is seeded, and the seed is recorded on every verdict
 *
 * An unseeded shuffle means a re-run grades a different arrangement, so the numbers move for no reason and
 * nobody can tell a real change from a reshuffle. The seed is derived — see `shuffleSeedFor` — from the caller's
 * salt plus the question and the participating system ids, and it is attached to each returned verdict so the
 * arrangement survives into `report.mjs`'s raw outputs and can be reconstructed from the results alone.
 *
 * ## Contract
 *
 * `benchmarks/harness/CONTRACTS.md`:
 *
 * ```js
 * judgeBlind({ question, gold, candidates, client, prompts })  // -> [{ systemId, correct, reason }]
 * ```
 *
 * The returned objects carry two ADDITIONAL fields, `position` and `shuffleSeed`, which is additive and does not
 * change the agreed shape. `seed` is accepted as an OPTIONAL extra input for the same reason: adding a required
 * parameter to a signature four modules were written against in parallel would have broken all four, and the
 * protocol's reproducibility requirement is met without it because the derivation is deterministic and recorded.
 */
import { createHash } from 'node:crypto';

/**
 * A judge reply that does not yield exactly one verdict per candidate.
 *
 * Thrown, never swallowed. Scoring an unparseable reply as "incorrect" would penalise whichever system happened
 * to produce the answer the judge phrased oddly about — a silent, system-specific bias in the direction nobody
 * would think to look for. A named class so `run.mjs` can count these separately from budget and transport
 * failures, and so a results file can state how many questions the judge failed to grade rather than folding
 * them into the score.
 */
export class JudgeUnparseable extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'JudgeUnparseable';
    Object.assign(this, details);
  }
}

/**
 * The reply format, verbatim as it is sent.
 *
 * Exported because the instruction and the parser MUST NOT be able to drift apart — one rule in two places with
 * the weaker one winning silently is the defect this repository produces most (`CLAUDE.md`). A gate can assert
 * that `benchmarks/prompts/judge.md` does NOT also specify an output format: if it does, the frozen prompt and
 * this constant are two sources for one rule and the model gets to choose which to obey.
 *
 * It is appended to the USER message rather than merged into the judge prompt, so the frozen `judge.md` stays
 * byte-identical to what the protocol publishes and the results reproduce it without an editorial footnote.
 */
export const RESPONSE_FORMAT = [
  'Reply with exactly one line per candidate answer, numbered as above, in that order, and nothing else:',
  '',
  '  <number>: CORRECT - <one sentence saying why>',
  '',
  'Write CORRECT or INCORRECT in capitals. Grade every candidate, including one whose answer is empty. Do not',
  'put two candidates on one line, do not add a preamble, a summary or a total.',
].join('\n');

/**
 * Reply headroom, in tokens.
 *
 * Sized from the candidate count because a truncated reply loses its LAST verdicts, which surfaces as
 * `JudgeUnparseable` and throws away a whole question's grading — an expensive way to save a few tokens. One
 * verdict is a number, a word and a sentence; 120 is roughly four times that, which absorbs a judge that writes
 * two sentences without paying for one that writes an essay.
 */
const TOKENS_PER_VERDICT = 120;
/** Enough for a judge that opens with a line of throat-clearing before the list, which the parser skips. */
const TOKENS_PREAMBLE = 200;

/**
 * One verdict line.
 *
 * ANCHORED to the start of an undecorated line, and that is the load-bearing part. The same pattern searched
 * anywhere in the reply would find the `CORRECT` inside `INCORRECT` and score every wrong answer right — the
 * worst single mistake this file could make, and one that would look like a strong result rather than a bug.
 * (JS alternation is first-match, not longest-match, so `INCORRECT` is written first as well; with the anchor in
 * place that ordering is belt and braces, verified rather than assumed.)
 *
 * The `[*_]*` after the verdict closes markdown emphasis the judge opened before the number (`**1: CORRECT** -`)
 * — without it the closing asterisks are read as the start of the reason.
 */
const VERDICT_LINE = /^(\d+)\s*[.:)\]]?\s*(INCORRECT|CORRECT)\b[*_]*\s*(?:[-–—:.]+\s*)?(.*)$/i;

/**
 * Strip list decoration from a line before matching it.
 *
 * A judge that returns its verdicts as a markdown list (`- **1: CORRECT** - ...`) has answered correctly in a
 * different typeface. Refusing that would discard a well-formed grading over formatting, so the decoration is
 * removed from the anchored ENDS of the line only — never from the middle, where an asterisk is the judge's own
 * prose. Anchored runs, not a character window: this cannot fall short as the line grows.
 */
function undecorate(line) {
  return line.trim().replace(/^[*_>#+\-\s]+/, '').replace(/[*_\s]+$/, '');
}

/**
 * A 32-bit PRNG state derived from the material that identifies this grading.
 *
 * ## Why the caller's seed is a SALT and not the seed itself
 *
 * Seeding every question with the same constant is worse than not shuffling at all. Fisher-Yates over the same
 * `n` with the same seed produces the same permutation every time, so the system whose id sorts first lands in
 * the same slot for all 1 986 questions — position bias stops averaging out and becomes a systematic offset in
 * one system's favour, while the results file truthfully says "the candidates were shuffled". Mixing the
 * question in makes the arrangement differ per question and stay identical across re-runs, which is the property
 * the protocol actually needs.
 *
 * The system ids are sorted before hashing so that the arrangement depends on WHICH systems are in the run, not
 * on the order `run.mjs` happened to assemble them — otherwise adding a system to the end of a config list
 * silently reshuffles every earlier one and the numbers move for no reason.
 *
 * @param {object} args
 * @param {string} args.question   the question text
 * @param {string[]} args.systemIds
 * @param {string} args.salt       the run's seed, stringified; `''` when the caller passed none
 * @returns {number} uint32
 */
export function shuffleSeedFor({ question, systemIds, salt }) {
  const material = JSON.stringify([salt, question, [...systemIds].sort()]);
  // Four bytes because that is what a 32-bit generator consumes; the rest of the digest would be discarded.
  return createHash('sha256').update(material, 'utf8').digest().readUInt32BE(0);
}

/** mulberry32 — a 32-bit PRNG in a dozen operations. Node ships no seedable RNG and this adds no dependency. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The presentation order: `order[p]` is the index of the candidate shown in slot `p`.
 *
 * Fisher-Yates, so every permutation is equally likely — the naive `sort(() => rand() - 0.5)` is not uniform and
 * favours the identity permutation, which would leave exactly the bias the shuffle exists to remove.
 *
 * @param {number} n
 * @param {number} seed uint32
 * @returns {number[]}
 */
export function shuffledOrder(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  const rand = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * Render the gold answer.
 *
 * The release stores some answers as JSON numbers (`"answer": 2022`) and adversarial questions carry no `answer`
 * at all. A number is accepted and printed in full; refusing it would refuse a slice of the dataset over a
 * typing accident in somebody else's file. An EXPLICIT `null` is the adversarial case and says so — it is not
 * the same as the field being missing, which is refused, so a caller cannot reach the adversarial rendering by
 * forgetting to pass anything.
 */
function renderGold(gold) {
  if (gold === null) {
    return '(none — the conversation does not contain an answer to this question, so the only correct response '
      + 'is one that declines to answer or says the conversation does not say)';
  }
  return typeof gold === 'number' ? String(gold) : gold;
}

/**
 * The user half of the judge call: the question, the gold answer, the anonymous candidates, the reply format.
 *
 * Candidates are wrapped in explicit begin/end markers rather than separated by blank lines, because a candidate
 * answer can be empty or several paragraphs long and a blank-line separator makes both of those ambiguous — the
 * judge would have to guess where one answer stopped, and a mis-split answer is graded as two wrong ones.
 *
 * @param {object} args
 * @param {string} args.question
 * @param {string|number|null} args.gold
 * @param {string[]} args.presented answers in presentation order
 * @returns {string}
 */
export function buildJudgeMessage({ question, gold, presented }) {
  const blocks = presented.map((answer, i) => {
    const n = i + 1;
    return `--- CANDIDATE ${n} ---\n${answer}\n--- END CANDIDATE ${n} ---`;
  });

  return [
    `QUESTION:\n${question}`,
    '',
    `GOLD ANSWER:\n${renderGold(gold)}`,
    '',
    `CANDIDATE ANSWERS (${presented.length}):`,
    '',
    blocks.join('\n\n'),
    '',
    RESPONSE_FORMAT,
  ].join('\n');
}

/**
 * Parse the judge's reply into exactly `expected` verdicts, in slot order.
 *
 * ## Strict, and an ERROR rather than a default
 *
 * Anything that does not yield one verdict per candidate throws. The tempting alternative — treat a missing or
 * unreadable verdict as "incorrect" — is a bias that lands on one system rather than on the run: whichever
 * system's answer the judge chose to editorialise about is the one that loses the point, and the results file
 * cannot show it because the score looks like a score. A thrown error is loud, countable, and the raw reply is
 * carried on it so a human can read what actually came back.
 *
 * No retry, either here or in the caller's loop: at `temperature: 0` a retry returns the same reply, and a retry
 * at any other temperature is a different measurement wearing the same number.
 *
 * A line must BEGIN with the candidate's number once list decoration is removed, so `Candidate 1: CORRECT` is
 * refused. That was chosen over accepting a leading word: at `temperature: 0` a judge that phrases it that way
 * phrases it that way for every question, so the run fails on the first one and the format is fixed — whereas a
 * pattern loose enough to accept a leading word also accepts a sentence that merely mentions a number and a
 * verdict, and that failure grades the judge's prose instead of its decision.
 *
 * A verdict with no reason after it is KEPT with `reason: ''`. The verdict is the measurement and the reason is
 * documentation of it; discarding a correct measurement because its annotation was missing would be strictness
 * pointed at the wrong half. The empty string is visible in the raw outputs, so the protocol's hand-checked
 * agreement sample can skip those rather than silently score them.
 *
 * @param {string} text     the judge's raw reply
 * @param {number} expected the candidate count
 * @returns {{correct: boolean, reason: string}[]} indexed by presentation slot
 * @throws {JudgeUnparseable}
 */
export function parseVerdicts(text, expected) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new JudgeUnparseable(`judge returned an empty reply; expected ${expected} verdicts`, {
      expected, found: 0, raw: text,
    });
  }

  const bySlot = new Map();
  const duplicates = [];
  for (const line of text.split(/\r?\n/)) {
    const m = VERDICT_LINE.exec(undecorate(line));
    if (!m) continue;
    const slot = Number(m[1]);
    if (bySlot.has(slot)) { duplicates.push(slot); continue; }
    bySlot.set(slot, { correct: m[2].toUpperCase() === 'CORRECT', reason: m[3].trim() });
  }

  const numbered = [...bySlot.keys()].sort((a, b) => a - b);
  const complete = numbered.length === expected && numbered.every((n, i) => n === i + 1);

  if (!complete || duplicates.length > 0) {
    // The failure names what was found, not just that something was wrong: "graded 1,2,4 of 4 expected" points
    // straight at a judge that skipped a candidate, which is a different fix from one that answered in prose.
    throw new JudgeUnparseable(
      `judge reply is not one verdict per candidate: expected ${expected} numbered 1..${expected}, `
      + `found [${numbered.join(',')}]`
      + (duplicates.length > 0 ? ` with ${duplicates.length} repeated (${[...new Set(duplicates)].join(',')})` : ''),
      { expected, found: numbered.length, slots: numbered, duplicates, raw: text },
    );
  }

  return numbered.map(n => bySlot.get(n));
}

/** Refuse rather than coerce — a silently-defaulted argument here mislabels a score, and nothing shows it. */
function requireArgs({ question, gold, candidates, client, prompts, seed }) {
  if (typeof question !== 'string' || question.trim() === '') {
    throw new TypeError('judgeBlind: `question` must be the question text as a non-empty string');
  }

  const goldOk = gold === null
    || (typeof gold === 'string' && gold.trim() !== '')
    || (typeof gold === 'number' && Number.isFinite(gold));
  if (!goldOk) {
    // Spelled out because the adversarial category is 22.5% of LoCoMo and its `answer` field is genuinely
    // absent: the caller has to DECIDE that null is what it means, rather than arrive there by omission.
    throw new TypeError(
      'judgeBlind: `gold` must be a non-empty string, a finite number, or an explicit `null` for a question '
      + 'the conversation does not answer (the adversarial category). It was '
      + (gold === undefined ? 'missing' : JSON.stringify(gold)),
    );
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new TypeError('judgeBlind: `candidates` must be a non-empty array of {systemId, answer}');
  }
  const seen = new Set();
  for (const [i, c] of candidates.entries()) {
    if (!c || typeof c.systemId !== 'string' || c.systemId.trim() === '') {
      throw new TypeError(`judgeBlind: candidates[${i}].systemId must be a non-empty string`);
    }
    if (typeof c.answer !== 'string') {
      // An empty answer is a real outcome and is graded; a non-string one means the caller passed the answerer's
      // whole result object, which would be stringified into "[object Object]" and graded as a wrong answer.
      throw new TypeError(
        `judgeBlind: candidates[${i}].answer must be a string (empty is allowed, and is graded), got `
        + typeof c.answer,
      );
    }
    if (seen.has(c.systemId)) {
      throw new TypeError(`judgeBlind: duplicate systemId ${JSON.stringify(c.systemId)} — the verdicts could `
        + 'not be re-labelled unambiguously');
    }
    seen.add(c.systemId);
  }

  if (!client || typeof client.complete !== 'function') {
    throw new TypeError(
      'judgeBlind: `client` must be a models.mjs client exposing complete({system, user, maxTokens})',
    );
  }
  if (!prompts || typeof prompts.judge !== 'string' || prompts.judge.trim() === '') {
    throw new TypeError('judgeBlind: `prompts.judge` must be the text of benchmarks/prompts/judge.md');
  }
  if (seed !== undefined && !Number.isInteger(seed)) {
    throw new TypeError(`judgeBlind: \`seed\` must be an integer when given, got ${JSON.stringify(seed)}`);
  }
}

/**
 * Grade every system's answer to one question, blind, in a single call.
 *
 * @param {object} args
 * @param {string} args.question   the question text — no evidence ids, no category, no retrieved context
 * @param {string|number|null} args.gold  the gold answer; explicit `null` for an unanswerable question
 * @param {{systemId: string, answer: string}[]} args.candidates  one per system under test
 * @param {object} args.client     from `models.mjs`
 * @param {{judge: string}} args.prompts  the frozen judge prompt, verbatim
 * @param {number} [args.seed]     the run's seed; mixed into the per-question shuffle, never used alone
 * @param {number} [args.maxTokens] overrides the reply headroom computed from the candidate count
 * @returns {Promise<{systemId: string, correct: boolean, reason: string, position: number, shuffleSeed: number}[]>}
 *          in the caller's INPUT order — returning presentation order would leak the shuffle into every
 *          downstream table and make two runs of the same config look like different runs.
 * @throws {TypeError} on a malformed argument
 * @throws {JudgeUnparseable} when the reply is not one verdict per candidate
 */
export async function judgeBlind({ question, gold, candidates, client, prompts, seed, maxTokens }) {
  requireArgs({ question, gold, candidates, client, prompts, seed });

  const shuffleSeed = shuffleSeedFor({
    question,
    systemIds: candidates.map(c => c.systemId),
    salt: seed === undefined ? '' : String(seed),
  });
  const order = shuffledOrder(candidates.length, shuffleSeed);

  const { text } = await client.complete({
    system: prompts.judge,
    user: buildJudgeMessage({ question, gold, presented: order.map(i => candidates[i].answer) }),
    maxTokens: maxTokens ?? TOKENS_PREAMBLE + TOKENS_PER_VERDICT * candidates.length,
  });

  // Throws on anything that is not one verdict per candidate. Deliberately NOT caught here: a caller that wants
  // to continue past an ungraded question must decide that itself and record it, because the alternative is a
  // score with a hole in it that the results file describes as complete.
  const verdicts = parseVerdicts(text, candidates.length);

  // Re-label. `order[p]` produced slot `p`, so slot `p`'s verdict belongs to candidate `order[p]`.
  const out = new Array(candidates.length);
  for (const [slot, candidateIndex] of order.entries()) {
    out[candidateIndex] = {
      systemId: candidates[candidateIndex].systemId,
      correct: verdicts[slot].correct,
      reason: verdicts[slot].reason,
      position: slot + 1,
      shuffleSeed,
    };
  }
  return out;
}
