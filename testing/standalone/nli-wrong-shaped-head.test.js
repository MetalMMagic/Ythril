/**
 * A wrong-shaped NLI head must not impersonate a dead endpoint.
 *
 * ## The report
 *
 * A reporter configured `MoritzLaurer/deberta-v3-base-zeroshot-v2.0` — a natural reading of the guide's "an
 * mDeBERTa or DeBERTa cross-encoder". It is a **2-class** head: `{0: entailment, 1: not_entailment}`.
 * `parseVerdict` maps only the three MNLI labels, so `not_entailment` resolved to nothing, `classify()`
 * returned null, and the contradiction scanner recorded `judge-unavailable` and parked its cursor.
 *
 * **A 2-class model does not degrade — it presents as a permanently unreachable endpoint.** Nothing in the
 * logs distinguished the two, and it cost them a container rebuild to find.
 *
 * ## What is pinned
 *
 * The null contract is UNCHANGED and that is deliberate: an unrecognised label must still mean "no
 * verdict", never "these records agree", because silently downgrading an unusable judge to agreement would
 * empty the review queue and look exactly like a clean instance. What changes is that the operator can see
 * WHY. So this pins both halves — the same null, and a label the log can name.
 *
 * Run: node --test testing/standalone/nli-wrong-shaped-head.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let parseVerdict;

describe('NLI verdict parsing', () => {
  before(async () => {
    ({ parseVerdict } = await import('../../server/dist/brain/nli-client.js'));
  });

  it('reads the three MNLI labels, by name and by index', () => {
    assert.deepEqual(parseVerdict({ label: 'contradiction', score: 0.9 }), { label: 'contradiction', score: 0.9 });
    assert.deepEqual(parseVerdict({ label: 'ENTAILMENT', score: 0.8 }), { label: 'entailment', score: 0.8 });
    assert.deepEqual(parseVerdict({ label: 'LABEL_1', score: 0.7 }), { label: 'neutral', score: 0.7 });
    // HF-style array, sorted by score.
    assert.deepEqual(parseVerdict([{ label: 'neutral', score: 0.6 }]), { label: 'neutral', score: 0.6 });
  });

  it('a 2-class head returns NO VERDICT — never "they agree"', () => {
    // The contract that must not drift. Downgrading an unusable judge to agreement would quietly empty
    // the review queue and be indistinguishable from a clean instance.
    assert.equal(parseVerdict({ label: 'not_entailment', score: 0.95 }), null);
  });

  it('an unreadable response is also no verdict', () => {
    assert.equal(parseVerdict(null), null);
    assert.equal(parseVerdict({ label: 'contradiction' }), null, 'no score is not a verdict');
    assert.equal(parseVerdict({ score: 0.9 }), null, 'no label is not a verdict');
  });

  it('the wrong-shape case is explained where it is configured', () => {
    // The cheapest half of the fix, and the one the reporter asked for by name: the requirement stated in
    // the row where the model is set, not only in a log line they would have to reach.
    const doc = readFileSync(join(process.cwd(), 'docs/integration-guide/05b-media-embedding.md'), 'utf8');
    const row = doc.split(/\r?\n/).find(l => l.includes('`mediaEmbedding.nli.model`'));
    assert.ok(row, 'the nli.model config row still exists');
    assert.match(row, /3-class/, 'it states that a 3-class MNLI head is required');
    assert.match(row, /not_entailment|2-class/, 'and names the 2-class shape that silently fails');
  });

  it('the LABEL_<n> ordering trap is documented', () => {
    // `cross-encoder/nli-deberta-v3-base` is {0: contradiction, 1: entailment, 2: neutral}, not the
    // standard MNLI ordering the fallback assumes — so an index-emitting server is misread as agreeing
    // for two labels in three, silently. Naming it is cheaper than guessing per-model orderings.
    const doc = readFileSync(join(process.cwd(), 'docs/integration-guide/05b-media-embedding.md'), 'utf8');
    const row = doc.split(/\r?\n/).find(l => l.includes('`mediaEmbedding.nli.model`'));
    assert.match(row, /LABEL_/, 'the index-label case is mentioned');
    assert.match(row, /ordering/i, 'and flagged as an ordering hazard rather than a naming detail');
  });
});
