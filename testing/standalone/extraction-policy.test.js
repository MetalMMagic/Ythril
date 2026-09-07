/**
 * F11 — document-extraction routing + validation policy (pure).
 *
 * `decideRoute` is the blueprint's "if available" routing, miniaturised; `validateExtraction` is the
 * control signal (OCR-evidence coverage) that drives promotion/fallback. Both pure — exhaustively tested
 * here against the real compiled module.
 *
 * Run: node --test testing/standalone/extraction-policy.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideRoute, validateExtraction, evidenceCoverage, coverageTokens, bestByEvidence,
} from '../../server/dist/files/converters/extraction-policy.js';
import { capDocExtractionMode } from '../../server/dist/files/converters/extraction-level.js';
import { normalizeDocExtractionMode, DOC_EXTRACTION_MODES_IN } from '../../server/dist/config/types.js';

const ALL = { ocr: true, render: true, vlm: true, repair: true, verify: true };
const none = (o) => ({ ocr: false, render: false, vlm: false, repair: false, verify: false, ...o });

describe('decideRoute', () => {
  it("mode 'ocr' is always the OCR-only path, regardless of availability", () => {
    for (const avail of [ALL, none()]) {
      const r = decideRoute('ocr', avail);
      assert.deepEqual(r.stages, ['ocr']);
      assert.equal(r.ocrOnly, true);
      assert.equal(r.label, 'ocr');
      assert.equal(r.fallbackReason, undefined);
    }
  });

  it("mode 'vlm' with everything available → OCR-grounded VLM (no repair/verify)", () => {
    const r = decideRoute('vlm', ALL);
    assert.deepEqual(r.stages, ['render', 'ocr-evidence', 'vlm', 'validate']);
    assert.equal(r.ocrOnly, false);
    assert.equal(r.label, 'ocr+vlm');
  });

  it("mode 'vlm' without OCR → ungrounded VLM (no ocr-evidence stage)", () => {
    const r = decideRoute('vlm', none({ render: true, vlm: true }));
    assert.deepEqual(r.stages, ['render', 'vlm', 'validate']);
    assert.equal(r.label, 'vlm');
  });

  it('a VLM mode falls back to OCR when render is missing', () => {
    const r = decideRoute('vlm', none({ ocr: true, vlm: true })); // no render
    assert.equal(r.ocrOnly, true);
    assert.deepEqual(r.stages, ['ocr']);
    assert.match(r.fallbackReason, /render/);
  });

  it('a VLM mode falls back to OCR when the VLM is missing', () => {
    const r = decideRoute('auto', none({ ocr: true, render: true })); // no vlm
    assert.equal(r.ocrOnly, true);
    assert.match(r.fallbackReason, /vlm/);
  });

  it("mode 'repair' composes repair + verify when wired in", () => {
    const r = decideRoute('repair', ALL);
    assert.deepEqual(r.stages, ['render', 'ocr-evidence', 'vlm', 'validate', 'repair', 'verify']);
    assert.equal(r.label, 'ocr+vlm+repair+verify');
  });

  it("mode 'repair' omits repair/verify when they aren't available", () => {
    const r = decideRoute('repair', none({ ocr: true, render: true, vlm: true }));
    assert.deepEqual(r.stages, ['render', 'ocr-evidence', 'vlm', 'validate']);
    assert.equal(r.label, 'ocr+vlm');
  });

  // CHANGED BEHAVIOUR (owner, 2026-07-21): 'auto' means "the most that is possible", so it now
  // resolves to the top rung instead of sitting level with 'vlm'. The previous test asserted the
  // opposite; it is inverted rather than removed, because that inversion IS the change.
  it("mode 'auto' resolves to the highest rung available — repair + verify when wired in", () => {
    const r = decideRoute('auto', ALL);
    assert.ok(r.stages.includes('repair'), "'auto' should use the repair model when one exists");
    assert.ok(r.stages.includes('verify'));
    assert.equal(r.label, 'ocr+vlm+repair+verify');
  });

  it("mode 'auto' degrades to plain VLM when no repair model is wired in", () => {
    const r = decideRoute('auto', none({ ocr: true, render: true, vlm: true }));
    assert.deepEqual(r.stages, ['render', 'ocr-evidence', 'vlm', 'validate']);
    assert.equal(r.label, 'ocr+vlm');
  });

  it("mode 'off' runs nothing at all — distinct from OCR-with-no-sidecar", () => {
    for (const avail of [ALL, none()]) {
      const r = decideRoute('off', avail);
      assert.deepEqual(r.stages, []);
      assert.equal(r.label, 'off');
      assert.equal(r.ocrOnly, false, "'off' is not the OCR path — nothing runs");
      assert.equal(r.fallbackReason, undefined, "'off' is a choice, not a degradation");
    }
  });
});

describe('evidenceCoverage / coverageTokens', () => {
  it('tokenizes alphanumeric runs of length ≥ 3, lowercased', () => {
    assert.deepEqual(coverageTokens('The Cat, a 42x dog!'), ['the', 'cat', '42x', 'dog']);
  });
  it('full coverage = 1', () => {
    assert.equal(evidenceCoverage('the quick brown fox', 'quick brown'), 1);
  });
  it('partial coverage is the hit fraction', () => {
    assert.equal(evidenceCoverage('alpha bravo', 'alpha bravo charlie delta'), 0.5);
  });
  it('no evidence → coverage 1 (nothing to violate)', () => {
    assert.equal(evidenceCoverage('anything', ''), 1);
  });
  it('empty result with real evidence → coverage 0', () => {
    assert.equal(evidenceCoverage('', 'some evidence tokens'), 0);
  });
});

describe('validateExtraction', () => {
  it('accepts well-covered non-empty output', () => {
    const v = validateExtraction('the quick brown fox jumped', 'quick brown fox');
    assert.equal(v.ok, true);
    assert.deepEqual(v.issues, []);
    assert.equal(v.coverage, 1);
  });
  it('flags empty output', () => {
    const v = validateExtraction('   ', 'evidence here');
    assert.equal(v.ok, false);
    assert.ok(v.issues.some(i => /empty/.test(i)));
  });
  it('flags truncation on finishReason length', () => {
    const v = validateExtraction('text', 'text', { finishReason: 'length' });
    assert.ok(v.issues.some(i => /truncat/.test(i)));
  });
  it('flags low OCR-evidence coverage below the threshold', () => {
    const v = validateExtraction('alpha', 'alpha bravo charlie delta echo', { minCoverage: 0.6 });
    assert.equal(v.ok, false);
    assert.ok(v.issues.some(i => /coverage/.test(i)));
  });
  it('no evidence → passes on coverage (nothing to compare)', () => {
    const v = validateExtraction('some output', '');
    assert.equal(v.ok, true);
  });
});

describe('bestByEvidence (F11-d consensus arbitration)', () => {
  const evidence = 'alpha bravo charlie delta echo';

  it('picks the candidate with the highest OCR-evidence coverage', () => {
    const primary = { text: 'alpha bravo', label: 'primary' };       // 2/5
    const verify  = { text: 'alpha bravo charlie delta', label: 'verify' }; // 4/5
    const r = bestByEvidence([primary, verify], evidence);
    assert.equal(r.candidate.label, 'verify');
    assert.equal(r.index, 1);
    assert.ok(Math.abs(r.coverage - 0.8) < 1e-9);
  });

  it('ties keep the EARLIER candidate → consensus is never worse than the primary (listed first)', () => {
    const primary = { text: 'alpha bravo charlie', label: 'primary' };
    const verify  = { text: 'charlie bravo alpha', label: 'verify' }; // same tokens, same coverage
    const r = bestByEvidence([primary, verify], evidence);
    assert.equal(r.candidate.label, 'primary');
    assert.equal(r.index, 0);
  });

  it('empty evidence → every candidate scores 1, so the primary (first) wins unchanged', () => {
    const primary = { text: 'anything', label: 'primary' };
    const verify  = { text: 'longer different text', label: 'verify' };
    const r = bestByEvidence([primary, verify], '');
    assert.equal(r.candidate.label, 'primary');
    assert.equal(r.coverage, 1);
  });

  it('a reconciled candidate that recovers dropped evidence wins', () => {
    const primary   = { text: 'alpha bravo', label: 'primary' };          // 2/5
    const verify    = { text: 'charlie delta', label: 'verify' };         // 2/5
    const consensus = { text: 'alpha bravo charlie delta echo', label: 'consensus' }; // 5/5
    const r = bestByEvidence([primary, verify, consensus], evidence);
    assert.equal(r.candidate.label, 'consensus');
    assert.equal(r.coverage, 1);
  });
});

describe('capDocExtractionMode — the instance ceiling', () => {
  it('a space may choose anything at or below the ceiling', () => {
    assert.equal(capDocExtractionMode('repair', 'ocr'), 'ocr');
    assert.equal(capDocExtractionMode('repair', 'vlm'), 'vlm');
    assert.equal(capDocExtractionMode('repair', 'repair'), 'repair');
    assert.equal(capDocExtractionMode('vlm', 'off'), 'off');
  });

  it('a choice above the ceiling is capped, not honoured', () => {
    assert.equal(capDocExtractionMode('ocr', 'repair'), 'ocr');
    assert.equal(capDocExtractionMode('vlm', 'repair'), 'vlm');
    assert.equal(capDocExtractionMode('off', 'repair'), 'off');
  });

  it("instance 'off' is a floor as well as a ceiling — nothing is analysed anywhere", () => {
    for (const choice of ['off', 'ocr', 'vlm', 'repair', 'auto']) {
      assert.equal(capDocExtractionMode('off', choice), 'off');
    }
  });

  it("a space on 'auto' follows the ceiling wherever it moves", () => {
    assert.equal(capDocExtractionMode('ocr', 'auto'), 'ocr');
    assert.equal(capDocExtractionMode('repair', 'auto'), 'repair');
    assert.equal(capDocExtractionMode('off', 'auto'), 'off');
  });

  it("an 'auto' ceiling imposes no policy limit — the space's choice stands", () => {
    assert.equal(capDocExtractionMode('auto', 'ocr'), 'ocr');
    assert.equal(capDocExtractionMode('auto', 'repair'), 'repair');
    assert.equal(capDocExtractionMode('auto', 'auto'), 'auto');
  });

  it('raising the ceiling does not raise a space that chose a lower rung', () => {
    // Capability grows centrally; the decision to use less of it stays local.
    assert.equal(capDocExtractionMode('repair', 'ocr'), 'ocr');
  });

  it('an unknown value is never silently downgraded', () => {
    assert.equal(capDocExtractionMode('repair', 'something-new'), 'something-new');
  });
});

describe('normalizeDocExtractionMode — the legacy max spelling', () => {
  it("'max' reads as 'repair', because it is a stored value in existing config.json files", () => {
    assert.equal(normalizeDocExtractionMode('max'), 'repair');
  });

  it('every other value passes through untouched', () => {
    // `DOC_EXTRACTION_MODES_IN` is the runtime list the source already declares against the mode type, so a
    // sixth mode is normalised-checked here without anybody editing this case.
    for (const m of DOC_EXTRACTION_MODES_IN) {
      assert.equal(normalizeDocExtractionMode(m), m);
    }
  });

  it('absent stays absent — "unset" must not become a level', () => {
    assert.equal(normalizeDocExtractionMode(undefined), undefined);
    assert.equal(normalizeDocExtractionMode(null), undefined);
  });

  it("a space stored as 'max' still gets the repair pass after the rename", () => {
    assert.equal(capDocExtractionMode('auto', normalizeDocExtractionMode('max')), 'repair');
    assert.ok(decideRoute(normalizeDocExtractionMode('max'), ALL).stages.includes('repair'));
  });
});

/**
 * 3.0 stopped ACCEPTING `max` (`_DEPRECATIONS.md` row 1.3) while keeping it READABLE from storage.
 *
 * Those two halves pull in opposite directions and both matter, so both are asserted here. The block
 * above proves a stored `max` still reaches the repair pass — that is the half whose failure would be
 * silent, moving an instance to a different extraction level on load. This block proves the input door
 * is shut, which is the half whose absence would leave a removal that removed nothing.
 */
describe('the max spelling is removed from the input surface, not from storage', () => {
  it('the accept-list no longer carries it', async () => {
    const { DOC_EXTRACTION_MODES_IN } = await import('../../server/dist/config/types.js');
    assert.equal(DOC_EXTRACTION_MODES_IN.includes('max'), false,
      'both request bodies build their zod enum from this list — a value here is a value accepted');
  });

  it('the accept-list and the mode type are now the SAME set', () => {
    // The row said to collapse them rather than leave a one-element difference nobody can explain. The
    // build enforces this too (`_modesMatch` in types.ts is `never`-typed on mismatch); this asserts the
    // resulting VALUES, since a type-level guard leaves nothing behind at runtime to check.
    assert.deepEqual([...DOC_EXTRACTION_MODES_IN].sort(), ['auto', 'ocr', 'off', 'repair', 'vlm']);
  });
});
