/**
 * A `:host` that carries box properties says what kind of box it is.
 *
 * ## The failure this exists for
 *
 * Extracting a component means moving its markup and its CSS, and the standard move is to turn the wrapper's
 * class into `:host` — the host IS the element the parent lays out, so a wrapper inside it would leave the host
 * unsized. That rewrite is right, and it silently loses one thing.
 *
 * **A `div` is block. A custom element is INLINE.** So `border`, `border-radius`, `padding`, `margin` and
 * `overflow` moved onto a `:host` are being applied to an inline box: it shrink-wraps its content, ignores
 * vertical margin, and clips nothing. The component still renders, which is why nothing catches it — there is
 * no error, no warning, and the styles are demonstrably present.
 *
 * Found in `UPLOAD_QUEUE_STYLES` (G-3), where `.upload-panel` — a `div` with a border, a radius, an overflow
 * and a 16px bottom margin — became a `:host` with none of those working. It shipped, and it took an
 * adversarial review of the whole split to see it.
 *
 * ## Why the rule is "carries a box", not "always"
 *
 * A host with only colour or font rules is fine inline, and some hosts are deliberately inline. The defect is
 * specifically the combination: box geometry on an element whose display was never stated. Two of the three
 * `:host` blocks in the graph page already set one, which is the convention this makes checkable.
 *
 * Run: node --test testing/standalone/a-host-with-a-box-declares-its-display.test.js
 */
import { describe, it } from 'node:test';
import { trackedSources } from './_sources.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

/** Every client source that could hold a styles literal. */
function styleSources() {
  return trackedSources('client/src')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .filter(f => readFileSync(f, 'utf8').includes(':host'));
}

/**
 * The declarations of each `:host { … }` block in a file, with the line it starts on.
 *
 * `:host(...)` and `:host-context(...)` are skipped: those are conditional forms that qualify an already-styled
 * host, and requiring a display in a `:host(.embedded)` override would fire on correct code.
 */
function hostBlocks(src) {
  const out = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*:host\s*\{/.test(lines[i])) continue;

    /*
     * A single-line block is the common form and the first version of this could not see it. It collected from
     * the NEXT line until a closing brace, so `:host { display: contents; }` had an empty body and the parser
     * went on to read the following selector's declarations as the host's — reporting five healthy components,
     * every one of which sets a display on the same line.
     *
     * A gate that reports healthy code gets switched off, which is worse than not having it.
     */
    const rest = lines[i].slice(lines[i].indexOf('{') + 1);
    if (rest.includes('}')) { out.push({ line: i + 1, body: rest.slice(0, rest.indexOf('}')) }); continue; }

    const body = [rest];
    for (let j = i + 1; j < lines.length && !/^\s*\}/.test(lines[j]); j++) body.push(lines[j]);
    out.push({ line: i + 1, body: body.join('\n') });
  }
  return out;
}

/** Properties that only mean something on a block-level box. */
const BOX = ['border', 'border-radius', 'padding', 'margin', 'overflow', 'width', 'height'];

describe('a :host carrying box geometry declares its display', () => {
  const sources = styleSources();

  it('finds host blocks at all (the check itself works)', () => {
    // A refactor that broke the scan would make the assertion below pass by examining nothing — the shape
    // this repo has now shipped three times.
    const total = sources.reduce((n, f) => n + hostBlocks(readFileSync(f, 'utf8')).length, 0);
    assert.ok(total >= 5, `expected several :host blocks across the client, found ${total}`);
  });

  it('every one of them sets display, or carries no box to lay out', () => {
    const offenders = [];
    for (const f of sources) {
      for (const { line, body } of hostBlocks(readFileSync(f, 'utf8'))) {
        const stripped = body.replace(/\/\*[\s\S]*?\*\//g, '');
        if (/(^|[\s;])display\s*:/.test(stripped)) continue;
        const box = BOX.filter(p => new RegExp(`(^|[\\s;])${p}\\s*:`, 'm').test(stripped));
        if (box.length) offenders.push(`${f}:${line} sets ${box.join(', ')} with no display`);
      }
    }
    assert.deepEqual(offenders, [],
      'a custom element is INLINE, so these box properties are being applied to a box that shrink-wraps its '
      + 'content and ignores vertical margin:\n' + offenders.map(o => `        ${o}`).join('\n'));
  });
});
