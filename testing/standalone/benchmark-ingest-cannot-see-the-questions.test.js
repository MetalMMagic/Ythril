/**
 * The benchmark's ingest stage cannot reach the questions it is going to be graded on.
 *
 * ## Why this is a gate and not a promise in a document
 *
 * The strongest way to overfit a memory benchmark is to shape the extraction around the questions — and it is
 * invisible from outside. Nobody can tell from a results table that an extraction prompt was iterated thirty
 * times against the answer key, which is exactly why "we didn't do that" is worth so little written down.
 *
 * `benchmarks/PROTOCOL.md` says the ingest stage is given the conversation and nothing else. This is the part
 * that makes the sentence checkable: an ingest module may not import, read, or otherwise name the question set.
 *
 * ## This gate is DORMANT until the harness exists, and says so out loud
 *
 * There is no harness yet — the protocol landed first, deliberately. A gate over an empty directory passes by
 * examining nothing, which is the failure this suite names more often than any other, so the dormant state is
 * ASSERTED rather than assumed: the count of ingest modules is checked, and the moment one appears the rule
 * binds. Writing it now is the point. A boundary added after the harness is a boundary the harness was not
 * designed against.
 *
 * Run: node --test testing/standalone/benchmark-ingest-cannot-see-the-questions.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

const HARNESS = join('benchmarks', 'harness');

/**
 * Names that identify the graded question set, in any spelling a module might reach it by.
 *
 * Deliberately broad. A gate that only banned one filename would be satisfied by renaming the import, and the
 * point is not to make the reference hard to write — it is to make it impossible to write by accident.
 */
const QUESTION_SET = [
  'questions', 'qa', 'answers', 'answer-key', 'answerKey', 'gold', 'groundTruth', 'ground-truth',
];

/** Every file under the harness whose name marks it as part of the ingest stage. */
function ingestModules() {
  if (!existsSync(HARNESS)) return [];
  const out = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(m?js|ts)$/.test(name)) continue;
      if (/ingest|extract|write-path/i.test(p)) out.push(p);
    }
  };
  walk(HARNESS);
  return out;
}

describe('the rule exists in the protocol, so it cannot be deleted instead of satisfied', () => {
  it('the protocol still says ingestion never sees the questions', () => {
    /*
     * The other way to make this gate pass is to remove the commitment. Asserting the sentence keeps the two in
     * step: weakening the protocol now fails the build rather than quietly lowering the bar, and an amendment
     * has to be argued for in the file where amendments are recorded.
     */
    const protocol = readFileSync(join('benchmarks', 'PROTOCOL.md'), 'utf8');
    assert.match(protocol, /Ingestion never sees the questions/,
      'the protocol no longer commits to question-blind ingestion — amend it deliberately, in the Amendments '
      + 'section, rather than by deletion');
    assert.match(protocol, /a gate asserts/,
      'the protocol should say this is enforced rather than intended, or the two drift apart');
  });
});

describe('no ingest module can reach the question set', () => {
  it('reports how many ingest modules exist, so a pass is never over nothing', () => {
    /*
     * The anti-vacuity assertion, and the only one that can fail today. `0` is the correct answer while the
     * protocol is ahead of the harness; the moment it is not, the case below starts doing work.
     */
    const found = ingestModules();
    assert.ok(Array.isArray(found), 'the walk is broken');
    if (found.length === 0) {
      assert.ok(!existsSync(join(HARNESS, 'ingest')),
        'an ingest directory exists but nothing in it was matched as an ingest module — widen the matcher '
        + 'rather than leaving this gate looking at nothing');
    }
  });

  it('none of them names the question set', () => {
    const offenders = [];
    for (const file of ingestModules()) {
      const src = readFileSync(file, 'utf8');
      for (const name of QUESTION_SET) {
        const re = new RegExp(`\\b${name}\\b`, 'i');
        if (re.test(src)) offenders.push(`${file.split(sep).join('/')}: names "${name}"`);
      }
    }
    assert.deepEqual(offenders, [],
      'The ingest stage must be given the conversation and nothing else. Shaping extraction around the questions\n'
      + 'is the strongest way to overfit a memory benchmark and the hardest to see from outside — which is why\n'
      + 'the protocol makes it structural rather than a promise. If a legitimate need for one of these words\n'
      + 'arises, rename the local thing; do not widen this list.\n'
      + offenders.join('\n'));
  });
});
