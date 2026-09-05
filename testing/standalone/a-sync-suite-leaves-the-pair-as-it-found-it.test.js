/**
 * A sync suite that creates a network deletes it again.
 *
 * ## Why this is a gate and not a convention
 *
 * `npm run test:sync` runs every suite in `testing/sync/` with `--test-concurrency=1` against ONE shared
 * pair of containers. So a suite that leaves a network behind changes the world the next suite runs in —
 * and the suite that leaks is never the suite that fails.
 *
 * That is what makes it worth a gate rather than a note. `peer-floor.test.js` was written without a
 * teardown, passed on its own, and broke `peer-revocation` and `pubsub-topology` in the full run. One of
 * the cases it broke is named *"credentials survive removal while the peer is still a member of another
 * network"* — the leftover network WAS that other network, so a revocation that should have happened did
 * not, and the failure pointed at code that was correct.
 *
 * The convention already existed and was unanimous: every one of the other suites cleaned up. A rule that
 * everybody follows and nothing enforces is a rule the next person does not know about.
 *
 * ## What "creates a network" means here
 *
 * `POST /api/networks` against one of the shared instances. A suite that only READS networks, or only
 * touches spaces, has nothing to undo. The check is deliberately about networks rather than about spaces:
 * a stray space is invisible to another suite, while a stray network puts a peer into a membership it did
 * not ask for and silently changes governance outcomes.
 *
 * Run: node --test testing/standalone/a-sync-suite-leaves-the-pair-as-it-found-it.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';

/** Tracked files only — a stray local copy is not part of the suite. */
function syncSuites() {
  const out = execFileSync('git', ['ls-files', 'testing/sync'], { encoding: 'utf8' });
  return out.split('\n').map(s => s.trim()).filter(f => f.endsWith('.test.js'));
}

const CREATES = /post\(\s*INSTANCES\.[a-d]\s*,\s*token[A-Da-d]\s*,\s*'\/api\/networks'/;
const DELETES = /method:\s*'DELETE'|\bdel\(|\bdelWithBody\(/;

describe('every sync suite leaves the shared containers as it found them', () => {
  it('found the suites at all — the check itself works', () => {
    const files = syncSuites();
    assert.ok(files.length >= 15,
      `only ${files.length} sync suites found, so this gate is measuring almost nothing`);
  });

  it('and the pattern actually matches something, or the rule is vacuous', () => {
    /*
     * The guard against the failure this repo produces most in its own gates: a regex that matches
     * nothing passes every file and reports a clean sweep over a rule it never applied.
     */
    const creators = syncSuites().filter(f => CREATES.test(stripComments(readFileSync(f, 'utf8'))));
    assert.ok(creators.length >= 10,
      `only ${creators.length} suites look like they create a network — the pattern has stopped matching `
      + 'the way these suites are written, so re-derive it before trusting a pass');
  });

  it('a suite that creates a network also deletes something', () => {
    /*
     * Comments stripped first: this file's own docblock names the endpoint, and several suites explain
     * their teardown in prose. A source-reading gate that counts its own explanation is the trap the
     * `stripComments` helper exists for.
     */
    const offenders = [];
    for (const f of syncSuites()) {
      const src = stripComments(readFileSync(f, 'utf8'));
      if (CREATES.test(src) && !DELETES.test(src)) offenders.push(f);
    }
    assert.deepEqual(offenders, [],
      `${offenders.join(', ')} creates a network and never removes it. \`test:sync\` runs every suite `
      + 'against ONE shared pair of containers, so the leftover changes the world the next suite runs in — '
      + 'and the suite that leaks is never the suite that fails');
  });
});
