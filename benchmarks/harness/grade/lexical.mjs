/**
 * Token-level F1 against the gold answer — LoCoMo's own metric, with no model in the loop.
 *
 * ## Why this file exists at all, when `grade/judge.mjs` is the better grader
 *
 * A judge costs a model call per question and carries prompt sensitivity; this costs nothing and is
 * deterministic, so it is the metric that can grade the whole retrieval grid and every re-run. It is also the
 * number the competing vendors publish, so it is the only one that makes our results comparable to theirs.
 *
 * **What it gets wrong, stated up front because the protocol depends on it being stated:** it under-credits a
 * correct answer worded differently. Measured on this implementation: gold `"7 May 2023"` against a correct
 * `"the seventh of May, 2023"` scores 0.57, and gold `"Single"` against `"She is single."` scores 0.50 — both
 * answers are right and the metric is not.
 * That is precisely why `benchmarks/PROTOCOL.md` never reports lexical alone. Two further consequences worth
 * naming, because both look like retrieval quality in a results table and neither is:
 *
 * - **F1 punishes verbosity.** Precision is over the prediction's own tokens, so a model that explains itself
 *   scores below the same model told to answer in a phrase. A lexical score is therefore not comparable across
 *   two answering prompts of different verbosity — only across systems sharing one frozen prompt.
 * - **It cannot distinguish a wrong answer from an abstention.** Both are 0. The adversarial category, where
 *   abstention is the *correct* behaviour, is unscoreable here and belongs to the judge.
 *
 * ## The normalisation is the metric
 *
 * Everything about the score is decided before a single token is compared, so each choice is spelled out rather
 * than buried in a chain of `.replace()`. This is the SQuAD `normalize_answer` — lowercase, strip ASCII
 * punctuation, strip the articles `a`/`an`/`the`, collapse whitespace — reproduced in the reference's order,
 * which is load-bearing:
 *
 *   1. lowercase
 *   2. remove punctuation (no replacement character — the characters simply vanish)
 *   3. remove article tokens
 *   4. split on whitespace
 *
 * Punctuation goes before articles because the other order changes the tokens: `"the-cat"` normalises to the
 * single token `thecat` in this order, and to `cat` in the other. LoCoMo's published numbers were produced in
 * this order, so this order is the one that is comparable.
 *
 * Because punctuation is deleted rather than replaced by a space, `"2.5"` becomes the token `25` and `"$2.50"`
 * becomes `250`. That is the reference's behaviour, it is wrong for numeric answers, and it is faithfully kept —
 * changing it would make every number in this benchmark incomparable with every published LoCoMo score to buy a
 * correction on a handful of questions.
 *
 * ### Two deliberate departures from a literal transcription of the Python
 *
 * - **Articles are removed token-wise, not by `/\b(a|an|the)\b/`.** JavaScript's `\b` is ASCII-only, so it sees a
 *   word boundary between an ASCII letter and an accented one: that regex turns `añejo` into `ñejo`, `aérobic`
 *   into `érobic` and `anécdota` into `écdota`, eating an article that was never there. Python's `\b` is
 *   Unicode-aware and leaves all three alone. On text that is already lowercased and punctuation-free, filtering
 *   whole tokens is exactly equivalent to the Python everywhere else and correct on these — checked against the
 *   Python for all ten of those spellings.
 * - **Punctuation is removed with a character set, not a hand-escaped character class.** A class like
 *   `/[!-\/:-@\[-`{-~]/` is four ASCII ranges chosen to add up to `string.punctuation`; it is unreadable, it is
 *   a magic window over the code-point table, and one mis-typed bound silently changes the score of every
 *   question. The set below is the 32 characters written out, so it can be read against the Python.
 *
 * ### Known data defect this metric cannot see past
 *
 * One gold answer in the pinned LoCoMo release carries eight U+200B ZERO WIDTH SPACEs glued inside words
 * (`"…small, consistent changes​​, finding…"`). U+200B is neither punctuation nor whitespace to Python
 * or to JavaScript, so four of that answer's tokens are unmatchable by any prediction: a system that reproduces
 * that gold word for word, minus the invisible characters, scores 0.86 and not 1. Stripping zero-width
 * characters here would raise our score on that question above every published score for it; it is left alone,
 * and recorded here so nobody re-discovers it as a retrieval failure.
 */

/** `string.punctuation`, written out. Removed with no replacement, exactly as the reference does. */
const PUNCTUATION = new Set(Array.from('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'));

/** The three articles SQuAD strips. Not a general stopword list — adding to this stops matching the reference. */
const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * Accept the two shapes an answer actually arrives in and refuse everything else by name.
 *
 * Numbers are accepted because the release stores six gold answers as JSON numbers (`2022`, `2`, `3`), and a
 * grader that made every caller remember to stringify would be graded correctly by whichever caller forgot.
 *
 * Everything else refuses rather than coerces. `String(undefined)` is `"undefined"` and `String(NaN)` is `"nan"`
 * — both grade happily and score near 0, so a broken runner that stopped passing predictions would show up as a
 * system that got worse, which is the exact failure shape this repo keeps paying for. A refusal names the
 * argument and the type instead.
 */
function asText(value, label) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    // NaN and ±Infinity stringify to plausible tokens. There is no answer they could be, so they are a bug.
    if (!Number.isFinite(value)) throw new TypeError(`lexical f1: ${label} is a non-finite number (${value})`);
    return String(value);
  }
  if (Array.isArray(value)) {
    // SQuAD grades against several golds and takes the max; LoCoMo ships one gold per question and the harness
    // contract is f1(prediction, gold), singular. Silently grading against element 0 would be a different metric
    // wearing this one's name.
    throw new TypeError(`lexical f1: ${label} is an array; this metric takes one answer, not a list of golds`);
  }
  throw new TypeError(`lexical f1: ${label} must be a string or a number, received ${value === null ? 'null' : typeof value}`);
}

/**
 * The normalised tokens of an answer — the only place normalisation happens.
 *
 * `normalizeAnswer` is built on this rather than beside it: two implementations of one rule, with the weaker one
 * winning silently, is the defect this codebase produces most, and a normaliser that drifted from its own
 * tokeniser would move every score in the benchmark without failing anything.
 *
 * @param {string|number} value
 * @param {string} [label] name used in refusal messages
 * @returns {string[]}
 */
export function tokenize(value, label = 'value') {
  const lowered = asText(value, label).toLowerCase();

  // Character-wise, so the 32-character set above is the whole specification of what is dropped. Unicode
  // punctuation (curly quotes, en dashes) is NOT in that set and survives here, as it does in the reference —
  // a model writing "Charlotte’s" therefore scores below one writing "Charlotte's". The pinned release contains
  // no curly quotes in any gold, so the cost falls only on predictions, equally for every system.
  const depunctuated = Array.from(lowered).filter((ch) => !PUNCTUATION.has(ch)).join('');

  // Splitting on /\s+/ collapses runs of whitespace and drops the empties at the ends — step 4 and the reference's
  // white_space_fix in one operation. Article removal is step 3 and happens on the split tokens; see the header
  // for why it is not the `\b` regex.
  return depunctuated.split(/\s+/).filter((token) => token.length > 0 && !ARTICLES.has(token));
}

/**
 * The normalised form of an answer as a string, for tests and for the raw-output dump in `report.mjs` — a
 * reader who wants to know why a correct-looking answer scored 0.33 needs to see what the grader actually
 * compared, not re-derive it.
 *
 * @param {string|number} value
 * @param {string} [label]
 * @returns {string}
 */
export function normalizeAnswer(value, label = 'value') {
  return tokenize(value, label).join(' ');
}

/**
 * Token-level F1 of a prediction against one gold answer.
 *
 * Multiset overlap, not set overlap: a prediction that repeats a gold token twice earns credit for it once, so
 * padding an answer with a repeated keyword lowers precision instead of raising recall.
 *
 * @param {string|number} prediction the system's answer; `''` is legitimate and scores 0
 * @param {string|number} gold the dataset's answer; may be a JSON number
 * @returns {{f1: number, precision: number, recall: number}} unrounded, in [0, 1]; formatting is `report.mjs`'s job
 */
export function f1(prediction, gold) {
  const predictionTokens = tokenize(prediction, 'prediction');
  const goldTokens = tokenize(gold, 'gold');

  // A gold that normalises to nothing cannot grade anything: it scores 0 against a perfect answer and against a
  // blank one alike, and that 0 enters the mean as if a system had failed. The reference returns 0 here; this
  // refuses, because attributing a data defect to a system is worse than stopping. Verified unreachable on the
  // pinned release — 0 of its 1,536 string golds and 6 numeric golds normalise to empty — so this cannot fire on
  // a run that is supposed to be comparable, only on data nobody has checked yet.
  if (goldTokens.length === 0) {
    throw new RangeError(`lexical f1: gold normalises to no tokens (${JSON.stringify(String(gold))}); it cannot be graded`);
  }

  // An EMPTY PREDICTION is not the same case: a system declining to answer is a real, meaningful outcome, and
  // the honest score for it against a non-empty gold is 0. Refusing here would crash a grid run over thousands
  // of questions because one answerer abstained. The asymmetry is deliberate.
  if (predictionTokens.length === 0) return { f1: 0, precision: 0, recall: 0 };

  const goldCounts = new Map();
  for (const token of goldTokens) goldCounts.set(token, (goldCounts.get(token) ?? 0) + 1);

  let shared = 0;
  for (const token of predictionTokens) {
    const remaining = goldCounts.get(token);
    if (remaining) {
      goldCounts.set(token, remaining - 1);
      shared += 1;
    }
  }

  // No overlap means precision and recall are both 0, and 2PR/(P+R) would be 0/0. The reference short-circuits
  // here for the same reason; returning NaN would poison every mean it is averaged into.
  if (shared === 0) return { f1: 0, precision: 0, recall: 0 };

  const precision = shared / predictionTokens.length;
  const recall = shared / goldTokens.length;
  return { f1: (2 * precision * recall) / (precision + recall), precision, recall };
}
