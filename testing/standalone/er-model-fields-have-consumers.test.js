/**
 * A field the ER model pays to compute must be read by something.
 *
 * ## The bug underneath the bug
 *
 * `linkedFrom: { memories, chrono, files }` existed on every entity type in the ER model for a whole release.
 * The server scanned three extra collections per space to fill it in — it even reports
 * `truncated.scan: 'links'` when that scan hits its cap — and the client's only mentions of the field were the
 * TypeScript interface and two test fixtures. **Nothing rendered it.**
 *
 * So the diagram called itself the data model while showing one of four record kinds, and every Overview load
 * paid for a three-collection scan and got nothing back. Nothing failed, nothing was slow enough to notice, and
 * no test was wrong. The owner found it by asking whether memories were missing from the picture.
 *
 * The lesson generalises past this field: a server that computes something no client reads is a cost with no
 * benefit, and it is invisible precisely because it works. So the rule is checked rather than remembered.
 *
 * ## Why this counts REAL consumers
 *
 * A type declaration is not a consumer. Neither is a test fixture — the fixtures are what made this look used:
 * `git grep linkedFrom client/src` returned three hits, all of which were the field being *described* rather
 * than *read*. So the interface file and `.spec.ts` files are excluded, and what remains has to be code that
 * does something with the value.
 *
 * Run: node --test testing/standalone/er-model-fields-have-consumers.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** git, not readdir: a scratch file is not a consumer, and a gitignored one is not shipped. */
const tracked = (glob) => execSync(`git ls-files ${glob}`, { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * Fields the server computes at real cost, and what would be lost if each stopped being read.
 *
 * Deliberately a short list of the EXPENSIVE ones rather than every field on the model. A gate that demanded a
 * consumer for every property would fire on things that are legitimately available-but-unused, and would be
 * turned off within a week.
 */
const COSTLY = [
  {
    field: 'linkedFrom',
    why: 'the server scans the memories, chrono and files collections per space to fill it in',
  },
  {
    field: 'danglingEdges',
    why: 'it is the count of edges whose endpoint no longer resolves — surfaced rather than dropped on purpose',
  },
];

describe('every costly ER field is actually read by the client', () => {
  const files = tracked('"client/src/**/*.ts"')
    .filter(f => !f.endsWith('.spec.ts'))
    // The interface file DESCRIBES the shape; describing it is not consuming it, and this is the file whose
    // presence made the unused field look used.
    .filter(f => !f.endsWith('core/api.types.ts'));

  it('finds a client to check', () => {
    assert.ok(files.length > 100, `expected the client source, found ${files.length} files`);
  });

  for (const { field, why } of COSTLY) {
    it(`${field} has a consumer`, () => {
      const users = files.filter(f => new RegExp(`\\b${field}\\b`).test(strip(readFileSync(f, 'utf8'))));
      assert.ok(users.length > 0,
        `nothing in the client reads \`${field}\`, and ${why}. That is a cost with no benefit, and it is `
        + 'invisible because it works — which is exactly how this field went a whole release unrendered.');
    });
  }

  it('the check is not vacuous — an invented field has no consumer', () => {
    // A regex that matched anything would pass every case above.
    const users = files.filter(f => /\bzzNotAField\b/.test(readFileSync(f, 'utf8')));
    assert.equal(users.length, 0);
  });

  it('the server still computes linkedFrom, so the consumer is not reading a dead field', () => {
    // The other direction. If the server stopped sending it, the client's use of it would be silently
    // undefined — and a diagram that quietly drops its memories box is the same class of bug reversed.
    const model = strip(readFileSync('server/src/brain/er-model.ts', 'utf8'));
    assert.match(model, /linkedFrom:/, 'the server no longer computes linkedFrom — the client reads nothing');
  });
});
