/**
 * No tracked text file contains a carriage return that is not part of a line ending.
 *
 * ## What a single stray byte does, and it is not cosmetic
 *
 * Git decides per file whether it holds TEXT or BINARY, and one of the things that makes it answer "binary"
 * is a CR that is not followed by LF. For a binary file git stops normalising line endings on the way in and
 * stops producing a line diff on the way out. Three consequences, in the order they bite:
 *
 *   1. **The whole file is stored with CRLF endings**, because nothing converted them. Every later commit
 *      that touches it re-stores the whole file.
 *   2. **A pull request shows the file as entirely rewritten** — `1 422 insertions, 1 419 deletions` for a
 *      two-line change. Nobody reviews that, and a real change hidden inside it is not reviewed either.
 *   3. **`git diff` on the working tree shows nothing useful**, so the state is self-concealing: the tool you
 *      would reach for to investigate is the tool that has been disabled.
 *
 * The file still parses, still compiles, and every other gate still passes. Same failure mode as mojibake,
 * one byte instead of three, and the same reason it needs a gate rather than a rule.
 *
 * ## How it gets in — one regex idiom, and it has shipped twice
 *
 * Inserting an import line after the file's first import is written as `/^import [^\n]*$/m`. On a CRLF
 * working tree — which is what `core.autocrlf` gives you on Windows — `[^\n]*` matches up to and INCLUDING
 * the CR, because the CR is not an LF. The replacement then appends its own `\r\n` after that CR, and the
 * file now holds `\r\r\n`: one lone CR, one line ending, and a file git has reclassified.
 *
 * It reached `main` twice before this gate existed, in `api/spaces-reembed.ts` and `mcp/tools/search.ts`,
 * both from that idiom in an earlier session — and both invisible, because point 2 above means the commit
 * that did it looked like a formatting pass. The third occurrence took thirteen files at once and is what
 * this gate was written from.
 *
 * The fix in the idiom is `[^\r\n]*` — or, better, not sniffing line endings at all.
 *
 * ## Why the WORKING TREE is the subject
 *
 * A CRLF working tree is legitimate here and a CRLF blob is not, so the honest subject looks like the blob.
 * It is not, for two reasons: reading every blob means a `git show` per file and takes minutes, and the blob
 * is downstream — by the time the bytes are committed the diff is already unreviewable. A lone CR is wrong in
 * either place, and the working tree is where it can still be caught before the commit that hides it.
 *
 * Run: node --test testing/standalone/no-source-file-carries-a-lone-cr.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const CR = 0x0d;
const LF = 0x0a;

/** Files whose bytes are not line-oriented text, so a CR in them means nothing. */
const NOT_TEXT = /\.(png|jpg|jpeg|gif|ico|webp|svgz|pdf|zip|gz|woff2?|ttf|eot|otf|mp3|mp4|webm|wasm|xlsx|docx|pptx|bin)$/i;

const tracked = () => execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\n').map(s => s.trim()).filter(Boolean).filter(f => !NOT_TEXT.test(f));

/** Every byte offset holding a CR that no LF follows. */
export function loneCarriageReturns(buf) {
  const at = [];
  for (let i = 0; i < buf.length; i++) if (buf[i] === CR && buf[i + 1] !== LF) at.push(i);
  return at;
}

/** The line the offset falls on, counted the way an editor counts — so a failure is navigable. */
function lineAt(buf, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (buf[i] === LF) line++;
  return line;
}

describe('no tracked text file carries a lone carriage return', () => {
  it('enumerates a meaningful number of files — the gate before the property', () => {
    // An empty list passes silently, which is the one outcome that would hide the defect completely.
    assert.ok(tracked().length > 500, `only enumerated ${tracked().length} files — the walk is broken`);
  });

  it('the whole tree is clean', () => {
    const offenders = [];
    for (const f of tracked()) {
      let buf;
      try { buf = readFileSync(f); } catch { continue; }  // a submodule or a broken symlink
      const at = loneCarriageReturns(buf);
      if (at.length) offenders.push(`${f}:${lineAt(buf, at[0])} — ${at.length} lone CR`);
    }
    assert.deepEqual(offenders, [], `${offenders.length} file(s) hold a CR with no LF after it:\n  `
      + offenders.join('\n  ')
      + '\n\n  Git reclassifies these as BINARY: the whole file is stored with CRLF endings and a pull'
      + '\n  request shows every line as rewritten, so the real change inside it goes unreviewed.'
      + '\n\n  Usually `\\r\\r\\n` from an insertion matched with `/[^\\n]*$/m`, which swallows the CR on a'
      + '\n  CRLF tree. Collapse `\\r\\r\\n` to `\\r\\n` and fix the pattern to `[^\\r\\n]*`.');
  });

  it('the detector actually detects', () => {
    // Mutation-proof: a scanner that never fires passes everything, and this one is a hand-written loop.
    const cr = String.fromCharCode(CR), lf = String.fromCharCode(LF);
    assert.deepEqual(loneCarriageReturns(Buffer.from(`a${cr}${cr}${lf}b`)), [1], 'the `\\r\\r\\n` shape is the case');
    assert.deepEqual(loneCarriageReturns(Buffer.from(`a${cr}b`)), [1], 'a bare CR mid-line counts');
    assert.deepEqual(loneCarriageReturns(Buffer.from(`a${cr}`)), [1], 'a CR at EOF has no LF after it');
    assert.deepEqual(loneCarriageReturns(Buffer.from(`a${cr}${lf}b${cr}${lf}`)), [], 'plain CRLF is not a finding');
    assert.deepEqual(loneCarriageReturns(Buffer.from(`a${lf}b${lf}`)), [], 'plain LF is not a finding');
  });

  it('reports the line, not just the byte', () => {
    // A byte offset in a 50 kB file is not somewhere a person can go. The offset is already known; turning
    // it into a line costs one pass and is the difference between a report and a task.
    const lf = String.fromCharCode(LF), cr = String.fromCharCode(CR);
    const buf = Buffer.from(`one${lf}two${lf}three${cr}${cr}${lf}four${lf}`);
    assert.equal(lineAt(buf, loneCarriageReturns(buf)[0]), 3);
  });
});
