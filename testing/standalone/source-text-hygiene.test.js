/**
 * No tracked source file contains a raw control byte.
 *
 * `server/src/brain/dupe-scanner.ts` carried a literal NUL for months. The use was correct — a field
 * separator in a hash input, so that `a`+`bc` and `ab`+`c` cannot collide — but written as a raw byte
 * instead of an escape. The consequence has nothing to do with the runtime:
 *
 *   **git classifies a file containing NUL as binary.** No diff, no blame, no line-level review, no
 *   three-way merge. The file was invisible to every review it went through, and `grep` answered
 *   "Binary file ... matches" instead of the matching line.
 *
 * A security-relevant module that silently opts out of code review is a bad trade for zero benefit:
 * `\u0000` in a template literal produces the identical string. The same applies to the stray `\b`
 * (0x08) that a Python/JS escape in a codemod will happily write into a file — visually absent, and
 * corrupting whatever line it lands on.
 *
 * Tab (0x09), LF (0x0a) and CR (0x0d) are excluded: they are ordinary text.
 *
 * Run: node --test testing/standalone/source-text-hygiene.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const EXTS = ['.ts', '.js', '.mjs', '.json', '.scss', '.html', '.md'];

/**
 * Ask **git** what files this repo has. Never walk the filesystem for this question.
 *
 * The first version of this gate did walk it, and CI caught it within the hour: `testing/sync/` holds
 * per-instance state the Docker test stack writes at 0600 as the container's UID, so the runner hit
 * `EACCES` on `testing/sync/configs/a/config.json` — a generated runtime artifact, not source, and not
 * tracked. The gate crashed on a file it had no business opening.
 *
 * The tracked set is the right one on both counts: it excludes generated state by construction, and it
 * is exactly the set that "no source file silently opts out of code review" is a claim about. A file
 * git does not track cannot have a diff to lose.
 */
function trackedSources() {
  // -z: NUL-separated, so a path containing a newline cannot split one entry into two. (Also the reason
  // this cannot use the default output: git quotes such paths instead, and the quoting would need undoing.)
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\u0000')
    .filter(Boolean)
    // No self-exclusion: this file talks about NUL and 0x08 without containing either, which is the
    // whole point it is making. A gate exempt from itself is the first one to rot.
    .filter(p => EXTS.some(e => p.endsWith(e)));
}

/** Control bytes that have no business in source text. */
function controlBytes(buf) {
  const found = [];
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32 || c === 127) found.push({ offset: i, code: c });
  }
  return found;
}

describe('source text carries no raw control bytes', () => {
  // Everything tracked, source and prose alike. The CHANGELOG is in scope on purpose: the entry
  // describing this very fix was written with a raw NUL in it. Prose that quotes a control character is
  // exactly where one gets pasted by accident.
  const files = trackedSources();

  it('finds the tracked tree', () => {
    // Guards the enumeration itself. If `git ls-files` fails or returns nothing — a detached checkout, a
    // missing git binary — every other assertion here would pass over an empty list and report green.
    assert.ok(files.length > 100, `expected a populated tracked tree, got ${files.length} files`);
  });

  it('no tracked source file contains one', () => {
    const offenders = [];
    for (const f of files) {
      const buf = readFileSync(f);
      const bad = controlBytes(buf);
      if (bad.length === 0) continue;
      const text = buf.toString('utf8');
      const first = bad[0];
      const line = text.slice(0, first.offset).split('\n').length;
      offenders.push(
        `${f}:${line}  ${bad.length} control byte(s), first is 0x${first.code.toString(16).padStart(2, '0')}`);
    }
    assert.deepEqual(offenders, [],
      'raw control bytes make git treat the file as BINARY — no diff, no blame, no review. Write the ' +
      'escape sequence instead (\\u0000, \\b): identical value, reviewable file.\n' + offenders.join('\n'));
  });

  it('the hash separator that started this is still a real NUL at runtime', () => {
    // The point was never to remove the separator — only to stop writing it as a raw byte. If a future
    // cleanup "fixes" the escape away, distinct entity pairs start colliding in the dupe scanner's
    // seen-set, which is silent and wrong rather than loud and wrong.
    const src = readFileSync('server/src/brain/dupe-scanner.ts', 'utf8');
    assert.match(src, /\$\{aText\}\\u0000\$\{bText\}/,
      'the pair-hash separator must stay, written as an escape');
    assert.equal(`a\u0000b`.length, 3, 'the escape is a real NUL at runtime');
  });
});
