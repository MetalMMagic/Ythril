/**
 * No component's inline `template` or `styles` literal contains a backtick.
 *
 * ## Why this is a gate and not a note
 *
 * A backtick inside one of those template strings ENDS it. What follows is parsed as TypeScript, so the error
 * is a syntax error somewhere below — and the compiler reports it against `@Component`, or as
 * `Failed to resolve styles at position 0 to a string`, or as `TS2552: Cannot find name 'error'`. None of
 * those name the line, and none of them says "backtick".
 *
 * It happens because both blocks are natural places to write prose, and prose about code wants
 * `identifiers in backticks` — the same habit that is correct in every other comment in the repo. It has cost
 * four builds in one day and is written down in three docblocks that say "no backticks anywhere in this
 * template, including comments". Those notes are read by whoever is already looking at the file.
 *
 * ## What it checks, and why that is exact rather than heuristic
 *
 * For every `template: BACKTICK` and `styles: [BACKTICK` opener, the NEXT backtick must be the one that
 * closes it — so the character after it is `,` or `]`, allowing whitespace. If a stray backtick sits inside
 * the literal, the "closing" one is followed by prose instead, and that is the failure.
 *
 * Run: node --test testing/standalone/no-backtick-inside-a-component-literal.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BT = '`';

/** Tracked client sources, so a build artefact or a stray copy cannot fail this. */
function componentFiles() {
  return execFileSync('git', ['ls-files', 'client/src'], { encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.endsWith('.component.ts') || f.endsWith('.directive.ts'));
}

/** Every inline literal opener in the file, as [label, index-of-its-opening-backtick]. */
function openers(src) {
  const out = [];
  for (const [label, needle] of [['template', 'template: ' + BT], ['styles', 'styles: [' + BT]]) {
    let at = src.indexOf(needle);
    while (at > -1) {
      out.push([label, at + needle.length - 1]);
      at = src.indexOf(needle, at + needle.length);
    }
  }
  return out;
}

describe('no backtick inside a component template or styles literal', () => {
  const files = componentFiles();

  it('found the components at all — the sweep is not passing over nothing', () => {
    // Floors it. A broken glob would make every check below pass trivially, which is the failure mode this
    // repo has paid for more than once.
    assert.ok(files.length >= 40, `only found ${files.length} component files`);
    const withInline = files.filter(f => openers(readFileSync(f, 'utf8')).length > 0);
    assert.ok(withInline.length >= 30, `only ${withInline.length} of them have an inline template or styles`);
  });

  it('every literal is closed by the next backtick after it', () => {
    const broken = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const [label, open] of openers(src)) {
        const next = src.indexOf(BT, open + 1);
        if (next === -1) {
          broken.push(`${f}: the ${label} literal is never closed`);
          continue;
        }
        // Whitespace then a closer. `}` and `)` are in the set because a template literal can be the LAST
        // property of the decorator object — closed by a newline and `})` rather than by a comma, which is
        // how the first version of this rule reported a false positive on a perfectly good component.
        const after = src.slice(next + 1, next + 6);
        if (!/^\s*[,\]})]/.test(after)) {
          const line = src.slice(0, next).split('\n').length;
          broken.push(`${f}:${line} — a backtick inside the ${label} literal ends it early`);
        }
      }
    }
    assert.deepEqual(broken, [], 'a backtick inside an inline template or styles literal TERMINATES the '
      + 'string, and the compiler reports it somewhere else entirely — against @Component, or as "Failed to '
      + 'resolve styles to a string". Write the identifier without backticks:\n  ' + broken.join('\n  '));
  });
});
