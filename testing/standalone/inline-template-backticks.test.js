/**
 * No backtick inside an Angular inline `template:` or `styles:` block.
 *
 * A component's template and styles are template literals. A backtick anywhere inside one — including in
 * a comment, which is where it always is — terminates the string early. What follows becomes code, and
 * TypeScript reports the failure at the `@Component` decorator or at a line number in the middle of the
 * CSS. It never points at the backtick.
 *
 * This has now cost six separate debugging detours: writing `.doc` or `--brand-mark` in a CSS comment,
 * exactly as one would in any other comment in this codebase, where the convention is to quote
 * identifiers. The habit is correct everywhere else, which is precisely why it keeps happening here.
 *
 * A compiler error does eventually catch it, so this is not about correctness — it is about the minutes
 * spent reading an error that points somewhere else. The message below names the real cause.
 *
 * Run: node --test testing/standalone/inline-template-backticks.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = 'client/src/app';

function sources(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`;
    if (statSync(p).isDirectory()) { sources(p, out); continue; }
    if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p.replace(/\\/g, '/'));
  }
  return out;
}

/** The inline `template:` and `styles: [...]` literals of a component, with where each starts. */
function inlineBlocks(src) {
  const out = [];
  for (const key of ['template: `', 'styles: [`']) {
    let i = src.indexOf(key);
    while (i >= 0) {
      const start = i + key.length;
      // The literal ends at the first UNESCAPED backtick — which is the whole point: if one appears
      // early, that is where the compiler thinks the block ends too.
      const end = src.indexOf('`', start);
      out.push({ key, start, end, line: src.slice(0, start).split('\n').length });
      i = src.indexOf(key, end < 0 ? start : end + 1);
    }
  }
  return out;
}

describe('inline component templates and styles contain no backticks', () => {
  const files = sources();

  it('finds the components (the check itself works)', () => {
    const withInline = files.filter(f => /(?:template|styles): \[?`/.test(readFileSync(f, 'utf8')));
    assert.ok(withInline.length >= 20, `expected inline-template components, found ${withInline.length}`);
  });

  it('no block is terminated early by a stray backtick', () => {
    const offenders = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
      for (const b of inlineBlocks(src)) {
        if (b.end < 0) continue;
        const body = src.slice(b.start, b.end);
        // A complete block's closing backtick is followed — after any whitespace or newlines — by the
        // punctuation that ends the property: `,` or `]` or the decorator's own `}`. Requiring that
        // punctuation IMMEDIATELY after reported a false positive on the common
        //
        //     template: `
        //       …
        //     `
        //     })
        //
        // shape, where a newline sits between. A false finding in a gate about a confusing error is
        // worse than no gate.
        if (/^\s*[,\]}]/.test(src.slice(b.end + 1, b.end + 12))) continue;
        offenders.push(`  ${f}:${b.line}  ${b.key.trim()} — first backtick closes it after ` +
          `${body.split('\n').length} line(s): ${JSON.stringify(body.slice(-60))}`);
      }
    }

    assert.deepEqual(offenders, [],
      'A backtick inside an inline template or styles block ends the string early. Everything after it\n' +
      'is parsed as code, and the compiler reports the error at @Component or at some line in the middle\n' +
      'of the CSS — never at the backtick. It is almost always in a COMMENT, quoting an identifier the\n' +
      'way every other comment in this codebase does:\n' + offenders.join('\n') +
      '\nWrite the identifier bare, or in single quotes.');
  });
});
