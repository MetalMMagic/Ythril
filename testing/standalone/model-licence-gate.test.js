/**
 * No model reaches a benchmark — and therefore a recommendation — without a checked licence.
 *
 * ## The specific failure this exists for
 *
 * Ythril ships commercially. The licence field on a model card does not settle whether a model may be
 * used commercially, because a model is plausibly a derivative work of its training data, and
 * permissive weights are routinely published on top of non-commercial datasets.
 *
 * The leading candidate for the equivalence layer was
 * `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`: card says `License: mit`, fine-tuned on
 * **XNLI, which is CC BY-NC 4.0**, plus machine translations of ANLI, also non-commercial. Reading the
 * card and moving on would have put a non-commercial dependency at the centre of a paid product's
 * duplicate detection.
 *
 * The gate sits on the bench rather than the shipping path on purpose: a model that gets benchmarked
 * gets compared, a model that compares well gets adopted, and the licence question is cheapest at the
 * moment of measurement.
 *
 * Run: node --test testing/standalone/model-licence-gate.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  CANDIDATES, PERMISSIVE_LICENCES, NON_COMMERCIAL_DATASETS, OPERATOR_SUPPLIED_SLOTS,
  candidate, assertCommerciallyUsable, clearCandidates,
} = await import('../bench/model-candidates.mjs');

describe('every candidate carries its evidence', () => {
  for (const c of CANDIDATES) {
    describe(c.id, () => {
      it('names a licence', () => assert.ok(typeof c.licence === 'string' && c.licence.length > 0));
      it('says what it would be used for', () => {
        assert.ok(['embedding', 'reranker', 'nli-equivalence', 'cross-encoder-sts'].includes(c.role), c.role);
      });
      it('records where the claim was read from', () => {
        assert.match(c.url, /^https:\/\//, 'a licence claim with no source cannot be re-checked');
      });
      it('records when it was checked', () => {
        // Model cards are edited in place. A claim with no date cannot be aged out.
        assert.match(c.verifiedOn, /^\d{4}-\d{2}-\d{2}$/);
      });
      it('says something about training-data provenance', () => {
        // The whole point: the weights licence is not the question.
        assert.ok(typeof c.trainingData === 'string' && c.trainingData.length > 20,
          'training-data provenance is the half a model card does not answer');
      });
      it('has an explicit verdict', () => {
        assert.ok(['clear', 'blocked'].includes(c.verdict), `${c.id} verdict: ${c.verdict}`);
      });
    });
  }
});

describe('the gate refuses what it should', () => {
  it('blocks the XNLI-trained NLI model despite its MIT weights', () => {
    // The case this file was written for. If this ever starts passing, the reasoning was lost.
    const id = 'MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7';
    assert.equal(candidate(id).licence, 'mit', 'the weights really are MIT — that is the trap');
    assert.throws(() => assertCommerciallyUsable(id), /not cleared for commercial use/);
    assert.throws(() => assertCommerciallyUsable(id), /xnli/);
  });

  it('blocks an unknown model rather than assuming it is fine', () => {
    assert.throws(() => assertCommerciallyUsable('some/unvetted-model'), /Unknown model/);
  });

  it('admits the cleared ones', () => {
    for (const c of CANDIDATES.filter(x => x.verdict === 'clear')) {
      assert.doesNotThrow(() => assertCommerciallyUsable(c.id), c.id);
    }
  });

  it('a blocked candidate must say what blocked it', () => {
    for (const c of CANDIDATES.filter(x => x.verdict === 'blocked')) {
      assert.ok(Array.isArray(c.blockedBy) && c.blockedBy.length > 0, `${c.id} needs blockedBy`);
      for (const d of c.blockedBy) {
        assert.ok(NON_COMMERCIAL_DATASETS.has(d), `'${d}' should be listed in NON_COMMERCIAL_DATASETS`);
      }
    }
  });

  it('every cleared licence is on the permissive list', () => {
    for (const c of CANDIDATES.filter(x => x.verdict === 'clear')) {
      assert.ok(PERMISSIVE_LICENCES.has(c.licence), `${c.id} has licence '${c.licence}'`);
    }
  });
});

describe('the stack still has a usable candidate for each job', () => {
  it('at least two embedding models are clear, so the choice is a measurement not a default', () => {
    assert.ok(clearCandidates('embedding').length >= 2);
  });

  it('the reranker is not proposed as the duplicate adjudicator', () => {
    // Relevance ("does this answer that") and equivalence ("do these mean the same") are different
    // tasks and different training objectives. Reusing the reranker would look reasonable and be wrong.
    const r = CANDIDATES.find(c => c.role === 'reranker');
    assert.match(r.notes, /NOT as the duplicate adjudicator|relevance/i);
  });

  it('there is no local equivalence model we could SHIP — stated, not hidden', () => {
    // Cross-lingual NLI routes through XNLI, so nothing here can become a bundled default or a
    // documented recommendation. Silence would read as "solved".
    assert.equal(clearCandidates('nli-equivalence').length, 0);
  });
});

describe('the boundary of the obligation', () => {
  it('operator-supplied slots are recorded, not merely absent', () => {
    // Ythril provides the slot; the operator brings url, model and key. The licence travels with them,
    // like the database they connect. Recording it makes the boundary a decision rather than an
    // omission — and makes adding a DEFAULT to one of these slots visibly a change of category.
    assert.ok(OPERATOR_SUPPLIED_SLOTS.has('assistModel'));
    assert.ok(OPERATOR_SUPPLIED_SLOTS.has('nli'));
  });

  it('a blocked model is blocked for SHIPPING, not for an operator to choose', () => {
    // The distinction has to survive in the text, or the next reader turns a scope boundary into a ban
    // on something that was never ours to forbid.
    const blocked = CANDIDATES.find(c => c.verdict === 'blocked');
    assert.match(blocked.notes, /ships, defaults to or recommends/);
    assert.match(blocked.notes, /their infrastructure and their licence/);
  });
});
