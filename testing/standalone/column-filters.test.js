/**
 * Per-column filters — the server side.
 *
 * The Description column had no control, and the box that DID exist (in the first column) searched
 * `description` as well as `name`/`fact`/`title` via `?search=`. So the column looked unfiltered while
 * something else quietly filtered it. A column control has to narrow its own column, or it reports
 * something it does not do.
 *
 * `?search=` keeps its documented multi-field behaviour — integrations use it — so this is a NEW
 * per-field parameter alongside it, not a change to it.
 *
 * Run: node --test testing/standalone/column-filters.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let textContains, tagContains;

before(async () => {
  ({ textContains, tagContains } = await import('../../server/dist/brain/tag-filter.js'));
});

describe('textContains', () => {
  it('matches a substring, case-insensitively', () => {
    const m = textContains('quarterly');
    assert.match('The QUARTERLY review notes', new RegExp(m.$regex, m.$options));
  });

  it('is unanchored — a whole-field match was the bug being fixed', () => {
    const m = textContains('review');
    assert.ok(!m.$regex.startsWith('^') && !m.$regex.endsWith('$'));
  });

  it('escapes the input, so a crafted value cannot act as a pattern', () => {
    const m = textContains('(a+)+$');
    const re = new RegExp(m.$regex, m.$options);
    assert.match('literal (a+)+$ here', re);
    assert.doesNotMatch('aaaaaaaa', re);
  });

  it('is the same matcher tag search uses', () => {
    // One implementation, so the two cannot drift into different answers — which is exactly what had
    // happened across the five record types before they were unified.
    assert.equal(tagContains, textContains);
  });
});

describe('every record type filters its own description column', () => {
  const SITES = [
    ['server/src/api/brain/_shared.ts', 'memories'],
    ['server/src/api/brain/entities.ts', 'entities'],
    ['server/src/brain/edges.ts', 'edges'],
    ['server/src/brain/chrono.ts', 'chrono'],
  ];

  for (const [file, label] of SITES) {
    it(`${label} applies a substring filter to \`description\``, () => {
      const src = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
      assert.match(src, /description'?\]?\s*=\s*textContains\(/,
        `${file} must narrow description with the shared substring matcher`);
    });
  }

  it('leaves `search` spanning its documented field set', () => {
    // Narrowing `search` to one field would silently break every integration using it.
    const src = readFileSync(new URL('../../server/src/brain/text-search.js'.replace('.js', '.ts'), import.meta.url), 'utf8');
    assert.ok(src.includes("memories: ['fact', 'description']"), 'search must still span both');
    assert.ok(src.includes("entities: ['name', 'description']"), 'search must still span both');
  });
});
