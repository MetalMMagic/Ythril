/**
 * A `$unset` entry is never tested for TRUTH — only for presence.
 *
 * ## The bug this exists for
 *
 * Mongo's convention for removing a field is `{ $unset: { tags: '' } }`, so an entry's value is the empty string.
 * `entities.ts` and `edges.ts` guarded a `$set` with
 *
 *     if (updates.tags !== undefined || (deleteFieldsPaths && !$unset['tags'])) $set['tags'] = newTags;
 *
 * which reads as "unless we are removing it" and means nothing of the kind: `!''` is `true`, always. So the `$set`
 * was always written, the update named one path in both `$set` and `$unset`, and Mongo rejected the whole write
 * with *"Updating the path 'tags' would create a conflict"*. `deleteFields` on a whole field could not work on
 * either record type, and the failure was a 500. Reported by the canary operator 2026-08-12.
 *
 * Nested paths were unaffected — deleting `properties.region` leaves `properties` present, so no `$unset` is
 * written for it — which is why every documented example worked and the feature looked fine.
 *
 * ## Why a gate rather than trusting the fix
 *
 * The value being falsy is a property of Mongo's API, not of this codebase, so the mistake is available to anyone
 * writing the next record type — and it is invisible on inspection, because the broken guard reads correctly. The
 * correct spellings all already appear in the same files: `'_expireAt' in $unset`, `delete $set[field]`, and now
 * `setUnlessDeleted`.
 *
 * **Comments are stripped before matching.** Without that, this gate would fire on the doc comment in
 * `delete-fields.ts` that quotes the broken line to explain it — a source-reading gate that cannot tell code from
 * the prose describing it fails on the fix and passes on the bug.
 *
 * Run: node --test testing/standalone/unset-presence-uses-in.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** Tracked `.ts` files under server/src — `git ls-files`, never a directory walk that picks up build output. */
function serverSources() {
  return execSync('git ls-files server/src', { encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(f => f.endsWith('.ts'));
}

/** Block and line comments out, string literals left alone (a `$unset` inside a string is not a test). */
function stripComments(text) {
  return text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * A `$unset[...]` read in a boolean position.
 *
 * Three shapes, which is every way the mistake has appeared or could: negated (`!$unset['x']`), as an operand of
 * `&&`/`||`, and as a whole condition (`if ($unset['x'])`). A comparison — `$unset['x'] === undefined` — is fine
 * and deliberately not matched: it is explicit about what it is asking.
 */
const TRUTH_TESTS = [
  { name: 'negated', re: /!\s*\$unset\s*\[/ },
  { name: 'as an && / || operand', re: /(?:&&|\|\|)\s*\$unset\s*\[[^\]]+\]\s*(?:\)|&&|\|\||\?)/ },
  { name: 'as a whole condition', re: /if\s*\(\s*\$unset\s*\[[^\]]+\]\s*\)/ },
];

describe('$unset entries are tested for presence, not truth', () => {
  const files = serverSources();

  it('found the sources to scan', () => {
    // Floors the enumeration: a broken glob would make every check below vacuous.
    assert.ok(files.length > 50, `only ${files.length} server sources found — is this running from the repo root?`);
    assert.ok(files.includes('server/src/brain/entities.ts'), 'the file this gate was written for must be in scope');
  });

  it('no file reads a $unset entry as a boolean', () => {
    const offenders = [];
    for (const f of files) {
      const code = stripComments(readFileSync(f, 'utf8'));
      for (const line of code.split('\n')) {
        for (const { name, re } of TRUTH_TESTS) {
          if (re.test(line)) offenders.push(`${f}: ${name} — ${line.trim().slice(0, 100)}`);
        }
      }
    }
    assert.deepEqual(offenders, [],
      'a $unset entry is the empty string, so testing it for truth is always the same answer. Use '
      + "`'field' in $unset`, or `setUnlessDeleted` from brain/delete-fields.ts:\n  " + offenders.join('\n  '));
  });

  it('the checker sees the shape it is looking for — proven on the real broken line', () => {
    // Mutation check, inline, so the gate cannot rot into one that passes on everything. This is the exact line
    // that shipped in entities.ts and edges.ts.
    const broken = "  if (updates.tags !== undefined || (deleteFieldsPaths && !$unset['tags'])) $set['tags'] = newTags;";
    assert.ok(TRUTH_TESTS.some(t => t.re.test(broken)), 'the pattern no longer matches the defect it was written for');

    // And the two correct spellings must NOT match, or the gate would demand its own fix be reverted.
    for (const ok of [
      "  if ('_expireAt' in $unset) delete (result as { _expireAt?: unknown })._expireAt;",
      "  setUnlessDeleted($set, $unset, 'tags', newTags, updates.tags !== undefined || !!deleteFieldsPaths);",
      "  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;",
      "  if ($unset['tags'] === undefined) $set['tags'] = newTags;",
    ]) {
      assert.ok(!TRUTH_TESTS.some(t => t.re.test(ok)), `false positive on a correct line: ${ok.trim()}`);
    }
  });

  it('strips comments, so quoting the defect to explain it is allowed', () => {
    // `delete-fields.ts` documents the broken line verbatim. A gate that fired on that would be a gate whose
    // only fix is deleting the explanation of the bug.
    const doc = stripComments(readFileSync('server/src/brain/delete-fields.ts', 'utf8'));
    assert.ok(!TRUTH_TESTS.some(t => t.re.test(doc)),
      'the broken pattern survived comment-stripping in delete-fields.ts — the stripper is the thing to fix');
    assert.match(readFileSync('server/src/brain/delete-fields.ts', 'utf8'), /!\$unset\['tags'\]/,
      'the doc comment should still quote the defect; if it stopped, this assertion is what noticed');
  });
});
