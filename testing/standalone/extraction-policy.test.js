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
  decideRoute, validateExtraction, evidenceCoverage, coverageTokens,
} from '../../server/dist/files/converters/extraction-policy.js';

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

  it("mode 'max' composes repair + verify when wired in", () => {
    const r = decideRoute('max', ALL);
    assert.deepEqual(r.stages, ['render', 'ocr-evidence', 'vlm', 'validate', 'repair', 'verify']);
    assert.equal(r.label, 'ocr+vlm+repair+verify');
  });

  it("mode 'max' omits repair/verify when they aren't available", () => {
    const r = decideRoute('max', none({ ocr: true, render: true, vlm: true }));
    assert.deepEqual(r.stages, ['render', 'ocr-evidence', 'vlm', 'validate']);
    assert.equal(r.label, 'ocr+vlm');
  });

  it("mode 'auto' never forces the max-only repair/verify tiers even when available", () => {
    const r = decideRoute('auto', ALL);
    assert.ok(!r.stages.includes('repair'));
    assert.ok(!r.stages.includes('verify'));
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
