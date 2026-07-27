/**
 * Standalone tests for the contradiction scanner's cursor keys (F-REVIEW slice 3c).
 *
 * The sweep itself needs MongoDB and a vector index, so it belongs in the Docker integration suite. What
 * CAN be pinned here without either — and what the whole design turns on — is that the two passes keep
 * SEPARATE cursors.
 *
 * Why that matters, restated because it is the subtle part: the duplicate scanner advances one cursor per
 * record, which is safe because a cosine score always answers. `judgePair` can decline — an unreachable NLI
 * endpoint yields `judge-unavailable` — and `recordContradiction` correctly writes nothing for those. But
 * writing nothing is not enough: with a single shared cursor the sweep would still have moved past the
 * record, so the pair would not be revisited until one of its records happened to change. An NLI outage
 * during a nightly sweep would permanently skip everything it touched, and the Review tab would look clean.
 *
 * Hence: the structured pass (deterministic, always answers) advances freely and works with no NLI model at
 * all, while the NLI pass keeps its own cursor that parks when the judge is unavailable and resumes exactly
 * where it stopped. If these two keys ever collide, that separation is gone and the bug is invisible.
 *
 * Run: node --test testing/standalone/contradiction-scanner.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let cursorKey, toJudgeable, DEFAULT_TYPES;

describe('contradiction scanner — cursor separation', () => {
  before(async () => {
    ({ cursorKey, toJudgeable, DEFAULT_TYPES } = await import('../../server/dist/brain/contradiction-scanner.js'));
  });

  it('gives the structured and NLI passes DIFFERENT cursors', () => {
    const structured = cursorKey('work', 'memory', 'structured');
    const nli = cursorKey('work', 'memory', 'nli');
    assert.notEqual(structured, nli,
      'one shared cursor would let an NLI outage permanently skip every pair the sweep touched');
  });

  it('scopes a cursor to its space and type, so spaces cannot advance each other', () => {
    assert.notEqual(cursorKey('work', 'memory', 'nli'), cursorKey('other', 'memory', 'nli'));
    assert.notEqual(cursorKey('work', 'memory', 'nli'), cursorKey('work', 'entity', 'nli'));
  });

  it('does not collide with the duplicate scanner\'s own cursors', () => {
    // The dupe scanner uses `${spaceId}:${type}` in the same collection. Colliding would make the two
    // scanners silently consume each other's progress.
    for (const pass of ['structured', 'nli']) {
      assert.notEqual(cursorKey('work', 'memory', pass), 'work:memory');
    }
  });

  it('is stable — the key is derived, not generated', () => {
    assert.equal(cursorKey('work', 'memory', 'nli'), cursorKey('work', 'memory', 'nli'));
  });
});

/**
 * Mapping a vector-search hit onto the judge's input.
 *
 * This is the shape of a bug that does not announce itself. A `RecallResult` carries `_id` (not `id`) and
 * keeps its free text under a per-type field — it has no `text` and no `summary`. When the mapping got both
 * wrong, nothing threw: every pair was written under the id `"undefined:undefined"`, so a whole space's
 * findings overwrote one another into a single row, and `judgePair` read the empty text as `no-text`, so the
 * NLI pass judged nothing at all while the sweep reported success.
 */
describe('contradiction scanner — recall hit → judgeable record', () => {
  const memoryHit = { _id: 'mem-1', type: 'memory', score: 0.97, fact: 'The server listens on 8080.' };

  it('carries the record ID across, so a pair is stored under the pair it is about', () => {
    assert.equal(toJudgeable(memoryHit).id, 'mem-1',
      'an undefined id collapses every finding in the space into one "undefined:undefined" row');
  });

  it('gives the judge non-empty text, or the NLI pass can never run', () => {
    const text = toJudgeable(memoryHit).text;
    assert.ok(text && text.trim().length > 0, 'empty text makes judgePair answer no-text for every pair');
    assert.match(text, /8080/, 'the text must be the record\'s own content, not a placeholder');
  });

  it('appends the description, which is what an entailment model has to work with', () => {
    const withDesc = toJudgeable({ ...memoryHit, description: 'Confirmed in the deploy log.' });
    assert.match(withDesc.text, /Confirmed in the deploy log\./);
  });

  it('attaches the claims it was given, and none when there are none', () => {
    assert.deepEqual(toJudgeable(memoryHit, { port: 8080 }).properties, { port: 8080 });
    assert.ok(!('properties' in toJudgeable(memoryHit)));
  });
});

describe('contradiction scanner — swept types', () => {
  it('sweeps chrono by default', () => {
    // Chrono was in neither scanner's defaults, so a calendar's contradictions were found by nothing.
    assert.ok(DEFAULT_TYPES.includes('chrono'));
    assert.ok(DEFAULT_TYPES.includes('memory') && DEFAULT_TYPES.includes('entity'));
  });
});
