/**
 * Every markdown table row in the docs actually renders as a table.
 *
 * ## The defect this pins
 *
 * A `| field | value |` row is only a table cell when the run of rows is a *table*. There are two ways to
 * write rows that render as literal pipes in a paragraph, and **neither one errors, warns, or fails any
 * lint we run**:
 *
 *   1. **No delimiter row.** GFM needs `| header |` + `|---|---|` before the body. Append rows one blank
 *      line below a finished table and they are a new block with no header — a paragraph of pipes.
 *   2. **Lazy continuation.** Put rows directly under a paragraph or blockquote with no blank line between
 *      and CommonMark absorbs them into that block. Inside a blockquote they render as *quoted* pipes.
 *
 * When this was written, four runs in the shipped guide were broken this way — including **21 consecutive
 * rows** (every `embedding.*`, `mediaEmbedding.*` and worker-tuning setting) swallowed into the end of the
 * 2.1 rename note. The configuration reference operators are pointed at was a wall of quoted pipes, and it
 * had been for as long as the note had been there. `markdownlint` passed on all four: it checks the style
 * of tables it recognises, and these were not tables.
 *
 * That is the same class as an unregistered icon or an absent metric series — the failure mode is silence,
 * so only an enumerating check finds it.
 *
 * Run: node --test testing/standalone/docs-tables-render.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOCS_ROOT, docFiles } from './_docs.mjs';

/** `|---|:--:|` and friends. At least one dash, nothing but dashes, colons, pipes and spaces. */
const DELIMITER = /^\|[\s:|-]*-[\s:|-]*\|\s*$/;

/**
 * Runs of `|`-rows that will not render as a table, as `{ line, rows, why }`.
 *
 * Fenced blocks are skipped: a code sample showing broken markdown is not broken markdown.
 */
export function brokenTableRuns(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  let fenced = false;

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) { fenced = !fenced; continue; }
    if (fenced || !lines[i].startsWith('|')) continue;

    let end = i;
    while (end + 1 < lines.length && lines[end + 1].startsWith('|')) end++;
    const run = lines.slice(i, end + 1);
    const before = i === 0 ? '' : lines[i - 1];

    // A heading directly above is fine — it opens a new block, so the rows are not continuing anything.
    const glued = before.trim() !== '' && !before.startsWith('#') && !before.startsWith('|');

    if (!run.some(l => DELIMITER.test(l))) found.push({ line: i + 1, rows: run.length, why: 'no delimiter row' });
    else if (glued) found.push({ line: i + 1, rows: run.length, why: `glued to: ${before.slice(0, 60)}` });

    i = end;
  }
  return found;
}

describe('docs table rows render as tables', () => {
  it('has no run of rows that renders as literal pipes', () => {
    const broken = [];
    for (const rel of docFiles()) {
      for (const b of brokenTableRuns(readFileSync(join(DOCS_ROOT, rel), 'utf8'))) {
        broken.push(`docs/${rel}:${b.line} — ${b.rows} row(s), ${b.why}`);
      }
    }
    assert.deepEqual(broken, [], `table rows that will not render as a table:\n  ${broken.join('\n  ')}\n\n`
      + 'Fix: keep the rows contiguous with their header+delimiter, and leave a blank line between a\n'
      + 'paragraph/blockquote and the table below it. If a note has to sit mid-table, repeat the header row.');
  });

  // The check above passes on an empty docs tree and on a detector that returns nothing. These pin that it
  // detects, in each spelling — the 21-row case was the "glued" spelling, and a delimiter-only check would
  // have missed it entirely.
  it('detects rows with no delimiter row', () => {
    const runs = brokenTableRuns('Some prose.\n\n| `a` | 1 |\n| `b` | 2 |\n');
    assert.equal(runs.length, 1);
    assert.match(runs[0].why, /no delimiter/);
    assert.equal(runs[0].rows, 2);
  });

  it('detects rows swallowed by the block above them', () => {
    const runs = brokenTableRuns('> a note\n> that ends here.\n| H | H |\n|---|---|\n| `a` | 1 |\n');
    assert.equal(runs.length, 1, 'a well-formed table glued to a blockquote still does not render');
    assert.match(runs[0].why, /glued to: > that ends here\./);
  });

  it('accepts a well-formed table, and one under a heading', () => {
    assert.deepEqual(brokenTableRuns('Prose.\n\n| H | H |\n|---|---|\n| `a` | 1 |\n'), []);
    assert.deepEqual(brokenTableRuns('## Heading\n| H | H |\n|:-:|---|\n| `a` | 1 |\n'), []);
  });

  it('ignores broken tables shown inside a fenced example', () => {
    assert.deepEqual(brokenTableRuns('```markdown\n| `a` | 1 |\n| `b` | 2 |\n```\n'), []);
  });
});
