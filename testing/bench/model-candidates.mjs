/**
 * Candidate models for the retrieval/adjudication stack, and the licence evidence for each.
 *
 * ## Why this file is a gate and not a note
 *
 * Ythril is shipped commercially, so every model it recommends or bundles must be usable
 * commercially. That question is **not** answered by the licence field on a model card, because a
 * model is plausibly a derivative work of the data it was trained on, and permissive weights are
 * routinely published on top of non-commercial data.
 *
 * That is not hypothetical. The multilingual NLI model that was the leading candidate for the
 * equivalence layer — `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7` — carries
 * `License: mit` on its card and is fine-tuned on **XNLI, which is CC BY-NC 4.0**. ANLI is likewise
 * non-commercial. Hugging Face carries public discussions titled exactly "License Conflict: MIT vs
 * CC BY-NC 4.0" on sibling models. Taking the card at face value would have put a non-commercial
 * dependency at the centre of a paid product.
 *
 * So each entry records **two** things — the weights licence and what is known about training-data
 * provenance — plus the URL the claim was read from and the date. {@link assertCommerciallyUsable}
 * refuses to benchmark anything that has not cleared both.
 *
 * ## What "cleared" means here
 *
 * `verdict: 'clear'` means: permissive weights licence, and no known non-commercial dataset in the
 * training mix. It is an engineering judgement recorded with its evidence so it can be re-checked or
 * overruled — **not legal advice**, and a licence can change under a model at any time. Re-verify
 * before shipping a dependency on any of these.
 *
 * ## Where the obligation starts and stops
 *
 * This gate covers models **Ythril is responsible for**: bundled weights, the defaults a fresh install
 * runs on, and anything named as a recommendation in the docs or the admin UI. Picking those is our
 * act, and a customer inherits the consequences without having chosen.
 *
 * It does **not** cover a model the operator supplies entirely themselves — the assist model, or any
 * endpoint they point the vision / STT / NLI slots at. Those are their infrastructure, their account
 * and their licence decision, exactly like the database they connect. Ythril provides the slot, not
 * the model.
 *
 * The line matters in both directions. It means a customer may legitimately point their own NLI
 * endpoint at a model this file blocks — that is their call to make. And it means we must not smuggle a
 * recommendation past the gate by putting it in a doc example or a placeholder instead of a default.
 */

/** Licence families this project accepts for a bundled or recommended model. */
export const PERMISSIVE_LICENCES = new Set(['mit', 'apache-2.0', 'bsd-3-clause', 'cc-by-4.0']);

/** Datasets known to forbid commercial use. A model trained on one is treated as tainted. */
export const NON_COMMERCIAL_DATASETS = new Set(['xnli', 'anli', 'nllb', 'mrpc-research-only']);

/**
 * Verified 2026-07-30. Re-verify before shipping — model cards are edited in place.
 *
 * `role` is what the candidate would do in the stack; `verdict` is whether it may be benchmarked.
 */
export const CANDIDATES = [
  {
    id: 'BAAI/bge-m3',
    role: 'embedding',
    licence: 'mit',
    url: 'https://huggingface.co/BAAI/bge-m3',
    verifiedOn: '2026-07-30',
    trainingData: 'Not enumerated on the card; no non-commercial dataset declared.',
    verdict: 'clear',
    notes: 'Multilingual, 8192 context, emits dense + sparse + multi-vector from one model — the only '
      + 'candidate that keeps late interaction available without a second re-embed.',
  },
  {
    id: 'intfloat/multilingual-e5-base',
    role: 'embedding',
    licence: 'mit',
    url: 'https://huggingface.co/intfloat/multilingual-e5-base',
    verifiedOn: '2026-07-30',
    trainingData: 'mC4 / mined web pairs; no non-commercial dataset declared.',
    verdict: 'clear',
    notes: '768 dims — same as the current index shape, so the vector index geometry does not change. '
      + 'Dense only: choosing it closes the door on late interaction without a further migration.',
  },
  {
    id: 'nomic-ai/nomic-embed-text-v2-moe',
    role: 'embedding',
    licence: 'apache-2.0',
    url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe',
    verifiedOn: '2026-07-30',
    trainingData: '1.6B filtered pairs; training data and code published (nomic-ai/contrastors).',
    verdict: 'clear',
    notes: 'Same family and prefix scheme as the model in production today, so the smallest code delta. '
      + 'Mixture-of-experts — ONNX viability for local embedding is the open question.',
  },
  {
    id: 'BAAI/bge-reranker-v2-m3',
    role: 'reranker',
    licence: 'apache-2.0',
    url: 'https://huggingface.co/BAAI/bge-reranker-v2-m3',
    verifiedOn: '2026-07-30',
    trainingData: 'Not enumerated on the card; no non-commercial dataset declared.',
    verdict: 'clear',
    notes: 'Multilingual cross-encoder. Trained for RELEVANCE, not equivalence — usable for retrieval '
      + 'reranking, NOT as the duplicate adjudicator. Those are different questions.',
  },
  {
    id: 'MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7',
    role: 'nli-equivalence',
    licence: 'mit',
    url: 'https://huggingface.co/MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7',
    verifiedOn: '2026-07-30',
    trainingData: 'Fine-tuned on XNLI (CC BY-NC 4.0) and multilingual-NLI-26lang-2mil7 (machine '
      + 'translations of English NLI sets including ANLI, also non-commercial).',
    verdict: 'blocked',
    blockedBy: ['xnli', 'anli'],
    notes: 'The weights say MIT; the training data does not permit commercial use. This was the leading '
      + 'candidate for the equivalence layer and is the reason this file exists. Blocked as something '
      + 'Ythril ships, defaults to or recommends — an operator pointing their OWN nli endpoint at it is '
      + 'a decision on their infrastructure and their licence, and is not ours to make or to prevent.',
  },
];

/**
 * Slots filled entirely by the operator, and therefore outside this gate.
 *
 * Ythril provides the slot; the operator brings the URL, the model and the key. The licence question
 * travels with them, the same way it does for the database they connect. Listed explicitly so the
 * boundary is a recorded decision rather than an omission — and so that adding a *default* or a
 * *recommendation* to one of these slots is visibly a change of category, not a config tweak.
 */
export const OPERATOR_SUPPLIED_SLOTS = new Set([
  'assistModel',   // F11-b: own url/model/key, mandatory egress acknowledgement on add
  'nli',           // contradiction judge — no sidecar ships one
  'rerank',        // no reranker ships by default
]);

/** Look a candidate up by id. */
export function candidate(id) {
  const c = CANDIDATES.find(x => x.id === id);
  if (!c) {
    throw new Error(
      `Unknown model '${id}'. Add it to CANDIDATES with its licence, training-data provenance, the URL `
      + 'the claim was read from, and the date — benchmarking a model whose licence nobody checked is '
      + 'how a non-commercial dependency reaches a paid product.',
    );
  }
  return c;
}

/**
 * Refuse to benchmark a model that has not cleared commercial use.
 *
 * The gate is on the bench rather than on the shipping path deliberately: a model that gets
 * benchmarked gets compared, and a model that compares well gets adopted. Stopping it at the point of
 * measurement is the last place the question is still cheap to ask.
 */
export function assertCommerciallyUsable(id) {
  const c = candidate(id);
  if (c.verdict !== 'clear') {
    throw new Error(
      `Refusing to benchmark ${id}: not cleared for commercial use.\n`
      + `  weights licence: ${c.licence}\n`
      + `  training data:   ${c.trainingData}\n`
      + `  blocked by:      ${(c.blockedBy ?? []).join(', ') || 'see notes'}\n`
      + `  ${c.notes}\n`
      + 'Ythril ships commercially. A permissive licence on the weights does not survive '
      + 'non-commercial training data.',
    );
  }
  if (!PERMISSIVE_LICENCES.has(c.licence)) {
    throw new Error(`Refusing to benchmark ${id}: licence '${c.licence}' is not on the permissive list.`);
  }
  return c;
}

/** Every candidate that may be benchmarked, optionally filtered by role. */
export function clearCandidates(role) {
  return CANDIDATES.filter(c => c.verdict === 'clear' && (role === undefined || c.role === role));
}
