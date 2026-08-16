/**
 * No tracked source file contains mojibake — UTF-8 that was decoded as ANSI and re-encoded.
 *
 * ## How it gets in, and why nothing catches it
 *
 * PowerShell 5.1's `Get-Content` decodes a BOM-less UTF-8 file as ANSI, so every multi-byte character arrives
 * as its individual bytes. `Set-Content -Encoding utf8` then writes those bytes back out as characters. An
 * em-dash (E2 80 94) comes out as the three characters `â€”`.
 *
 * The file still parses. It still compiles. Every test still passes. The damage is invisible to `tsc` and to
 * every gate in this repo, because it is only ever inside comments and human-readable strings — which is
 * exactly where it does its harm: those strings are tool descriptions an agent READS.
 *
 * ## It has happened twice, both times to me, both times through the same shell idiom
 *
 * `(Get-Content f -Raw) -replace ... | Set-Content -Encoding utf8 f` corrupted `loop-check.test.js`, which
 * was caught in the same session and rewritten. It then corrupted `api/tokens.ts` during the space-admin
 * change and MERGED — 49 sequences, discovered only by scanning the tree afterwards.
 *
 * A rule against the idiom was not enough, and the second occurrence is what makes this a gate. Edit files
 * with a UTF-8-native tool; if a scripted rewrite is genuinely needed, do it in node.
 *
 * ## The `Â ` case is deliberately excluded
 *
 * A stray `Â ` is the same corruption applied to a non-breaking space, but non-breaking spaces occur
 * legitimately in some content and a false positive here would be tuned away rather than fixed. `â€` cannot
 * occur in any language this repo is written in, so it is the signature worth gating on.
 *
 * Run: node --test testing/standalone/no-source-file-carries-mojibake.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** The unambiguous signature: `â€` is the first two bytes of any mis-decoded U+20xx punctuation. */
const MOJIBAKE = /â€|Ã¢â‚¬/;

const tracked = (globs) => execSync(`git ls-files ${globs}`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  .split('\n').map(s => s.trim()).filter(Boolean);

describe('no source file carries mis-decoded UTF-8', () => {
  it('scans a meaningful number of files — the gate before the property', () => {
    // An empty file list passes silently and would hide the exact defect this exists for.
    const files = tracked('"server/src/**/*.ts" "client/src/**/*.ts"');
    assert.ok(files.length > 200, `only enumerated ${files.length} source files — the walk is broken`);
  });

  it('server and client sources are clean', () => {
    const offenders = tracked('"server/src/**/*.ts" "client/src/**/*.ts"')
      .filter(f => MOJIBAKE.test(readFileSync(f, 'utf8')));
    assert.deepEqual(offenders, [], 'these were written by a tool that decoded UTF-8 as ANSI:\n  '
      + offenders.join('\n  ') + '\nRepair with node, not PowerShell.');
  });

  it('MCP tool descriptions especially — an agent reads these', () => {
    // Narrowed on purpose as well as covered above: a corrupted comment is ugly, and a corrupted tool
    // description is a reference an agent constructs arguments from.
    const offenders = tracked('"server/src/mcp/**/*.ts"')
      .filter(f => MOJIBAKE.test(readFileSync(f, 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('the detector actually detects', () => {
    // Mutation-proof for the regex itself: a gate whose pattern never matches passes everything.
    assert.ok(MOJIBAKE.test('capability documentation â€” every route'), 'the pattern must match real mojibake');
    assert.ok(!MOJIBAKE.test('capability documentation — every route'), 'and must not match the correct text');
  });
});
