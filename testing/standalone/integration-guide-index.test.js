/**
 * `docs/integration-guide.md` is an INDEX and nothing else.
 *
 * The guide was one 7,830-line file. Split by topic, the root path has to keep existing — the README, the
 * user guide, the Help page and released customer notes all link to it — so it became a contents page.
 *
 * The requirement that shapes this test, in the owner's words: *"only as linklist to the real ones, else
 * we have to remember editing multiple places."* A summary paragraph on an index is a second copy of a
 * claim, and this guide has already had two claims go stale — the egress list that omitted the endpoint
 * which was actually unguarded, and "no document content leaves your instance" while it was leaving. Both
 * survived because a reader had no way to know which of two statements was the current one.
 *
 * So the index may contain a title, an orientation line or two, and links. Not API detail, not examples,
 * not configuration — anything a reader might act on lives in exactly one part.
 *
 * The list is also hand-maintained, and this week produced seven separate instances of a hand-maintained
 * list being wrong. So the list and the directory are compared rather than trusted.
 *
 * Run: node --test testing/standalone/integration-guide-index.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const INDEX = 'docs/integration-guide.md';
const DIR = 'docs/integration-guide';

const index = readFileSync(INDEX, 'utf8');
const parts = readdirSync(DIR).filter(f => f.endsWith('.md')).sort();

describe('the integration guide index', () => {
  it('finds the parts (the check itself works)', () => {
    assert.ok(parts.length >= 5, `expected the split guide's parts, found ${parts.length}`);
  });

  it('links to every part, and to nothing that is not one', () => {
    const linked = [...index.matchAll(/\]\(integration-guide\/([^)#]+\.md)\)/g)].map(m => m[1]).sort();
    assert.deepEqual(linked, parts,
      'The index and the directory disagree. A part with no link is a document nobody can find from the\n' +
      'front door; a link with no part is a 404 for whoever clicks it.');
  });

  it('lists them in file order, which is reading order', () => {
    // The numeric prefix exists because the order is pedagogical — Getting Ythril, then Hosting, then the
    // APIs — and a GitHub folder listing sorts alphabetically. An index that contradicts the prefixes
    // would make the numbering worse than useless.
    const linked = [...index.matchAll(/\]\(integration-guide\/([^)#]+\.md)\)/g)].map(m => m[1]);
    assert.deepEqual(linked, [...linked].sort(), 'the index must list the parts in their numbered order');
  });

  it('carries no content of its own', () => {
    // What "content" means here, concretely: things a reader could act on and therefore things that can
    // go stale independently of the part that also states them.
    const offenders = [];
    if (/```/.test(index)) offenders.push('a fenced code block');
    if (/^\|/m.test(index)) offenders.push('a table');
    if (/\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\//.test(index)) offenders.push('an API endpoint');
    if (/^#{3,}\s/m.test(index)) offenders.push('a subsection heading (H3+)');
    const h2 = [...index.matchAll(/^##\s+(.*)$/gm)].map(m => m[1].trim());
    if (h2.length > 1 || (h2.length === 1 && h2[0] !== 'Contents')) {
      offenders.push(`H2 sections other than "Contents": ${h2.join(', ')}`);
    }
    assert.deepEqual(offenders, [],
      'The index has grown content. Every statement belongs in exactly one part — a copy here is a second\n' +
      'place to remember to edit, and the one that goes stale is whichever the editor did not have open.');
  });

  it('stays short enough to be obviously an index', () => {
    // A hard number rather than a judgement, because "it is getting long" is the sort of thing nobody
    // ever acts on. Roughly: a title, a couple of orienting lines, and one entry per part.
    const lines = index.split(/\r?\n/).length;
    assert.ok(lines < parts.length * 4 + 20,
      `the index is ${lines} lines for ${parts.length} parts — that is prose, not a contents page`);
  });

  it('every part points back at the index', () => {
    // Each part is reachable directly, from a search result or a deep link, and has to say what it is
    // part of. Cheap, and it is what makes a single part comprehensible on its own.
    const orphans = parts.filter(f =>
      !readFileSync(`${DIR}/${f}`, 'utf8').includes('](../integration-guide.md)'));
    assert.deepEqual(orphans, [], 'these parts have no backlink to the index');
  });
});
