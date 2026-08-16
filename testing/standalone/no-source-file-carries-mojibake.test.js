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

/**
 * The unambiguous signatures.
 *
 * `â€` is the first two chars of any mis-decoded U+20xx punctuation — em-dashes and smart quotes, which is
 * what prose corruption looks like.
 *
 * **`â”` and `â•` were added on 2026-08-16, after this gate passed a tree holding thousands of them.** Ten
 * files carried mis-decoded BOX-DRAWING characters (U+25xx) — every `── section ──` divider in the sync
 * routers and the graph component. They start `â”`/`â•`, never `â€`, so the original pattern could not see
 * them: it was written for the corruption that had bitten me, and box-drawing is the same corruption applied
 * to comment furniture rather than to prose.
 *
 * `api/tokens.ts` is the proof that this was a gap and not a new event. Its 49 `â€` sequences were repaired
 * when this gate was written; its 48 `â”` sequences sat there untouched, in a file everyone believed clean.
 *
 * Each of these is `â` followed by a character that cannot follow it in any language this repo is written
 * in, so none needs the tuning that kept `Â ` out — a lone `Â ` is a mis-decoded non-breaking space and
 * those occur legitimately.
 */
const MOJIBAKE = /â€|â”|â•|Ã¢â‚¬/;

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

  it('the SHIPPED DOCS are clean — a customer reads these', () => {
    // Added 2026-08-16: the gate covered only `.ts`, so the integration guide and the user guide — the two
    // things read by people who are not us — were never checked at all. They are clean today; this keeps
    // them that way, and it is the cheapest possible check on the most visible surface.
    //
    // `CHANGELOG.md` is deliberately NOT in scope. It carries one legitimate occurrence: the entry
    // announcing the mojibake repair quotes the corruption it fixed, which is the correct way to write that
    // entry and would make this assertion permanently red. Scoping to `docs/` rather than exempting a file
    // by name keeps the rule "what we publish is clean" instead of "everything except the file that annoys
    // the gate".
    const docs = tracked('"docs/**/*.md" "docs/*.md"');
    assert.ok(docs.length > 20, `only enumerated ${docs.length} doc files — the walk is broken`);
    const offenders = docs.filter(f => MOJIBAKE.test(readFileSync(f, 'utf8')));
    assert.deepEqual(offenders, [],
      'these ship to customers and were written by a tool that decoded UTF-8 as ANSI:\n  '
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

  it('and detects the BOX-DRAWING corruption it used to walk straight past', () => {
    // The regression assertion. These exact strings were in the tree, in ten files, while this gate was
    // green — a divider comment corrupted the same way an em-dash is, in a range the pattern did not cover.
    assert.ok(MOJIBAKE.test('// â”€â”€ Memories â”€â”€'), 'U+2500 dividers: `─` mis-decoded');
    assert.ok(MOJIBAKE.test('// â•â•â• Section â•â•â•'), 'U+2550 dividers: `═` mis-decoded');
    assert.ok(!MOJIBAKE.test('// ── Memories ──'), 'and the correct dividers must stay clean');
    assert.ok(!MOJIBAKE.test('// ═══ Section ═══'), 'both of them');
  });
});
