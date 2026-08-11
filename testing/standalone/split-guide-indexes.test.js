/**
 * The two split guides' front doors are INDEXES and nothing else.
 *
 * `docs/integration-guide.md`, `docs/userguide.md` and `docs/usecase-examples.md` are all link lists now,
 * with their real content in a sibling directory of parts. Two shapes, so two blocks:
 *
 *  - the **integration guide** index links each part exactly once, in numbered order, with no fragments. It
 *    is a contents page for a set of API references read one at a time, and it gets its own describe.
 *  - the **table-of-contents guides** (user guide, use-case examples) point several anchors into each
 *    chapter. So "each part exactly once, in order" is the wrong assertion there; "every chapter reachable,
 *    nothing linked that is not one" is the right one. Those two share a loop.
 *
 * Merging all three would have meant loosening the integration guide's assertion to whatever the other two
 * also satisfy, which is how a gate quietly stops checking the thing it was written for.
 *
 * ── The original rationale, which still applies to both ─────────────────────────────────────────────
 *
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

/**
 * The two TABLE-OF-CONTENTS guides.
 *
 * These share a shape the integration guide does not: their index points several anchors into each chapter,
 * so "each part linked exactly once, in order" is the wrong assertion and "every chapter reachable, nothing
 * linked that is not one" is the right one.
 *
 * Two of them is where a third hand-written copy stops being cheaper than a table. The one genuine
 * difference is `groupsWithH3`: the use-case index groups 28 examples under three chapter headings, which is
 * navigation, while an H3 in the user guide's twenty-line contents list would be content that had crept in.
 * One flag, named for what it means, rather than two near-identical describes to keep in step.
 */
const TOC_GUIDES = [
  { name: 'user guide', index: 'docs/userguide.md', dir: 'docs/userguide', minParts: 4, maxLines: 80, groupsWithH3: false },
  { name: 'use-case examples', index: 'docs/usecase-examples.md', dir: 'docs/usecase-examples', minParts: 3, maxLines: 120, groupsWithH3: true },
];

for (const g of TOC_GUIDES) {
  const slug = g.dir.replace('docs/', '');
  const text = readFileSync(g.index, 'utf8');
  const chapters = readdirSync(g.dir).filter(f => f.endsWith('.md')).sort();
  const reached = [...new Set([...text.matchAll(new RegExp(`\\]\\(${slug}/([^)#]+\\.md)`, 'g'))].map(m => m[1]))];

  describe(`the ${g.name} index`, () => {
    it('finds the chapters (the check itself works)', () => {
      assert.ok(chapters.length >= g.minParts, `expected this guide's chapters, found ${chapters.length}`);
    });

    it('reaches every chapter, and links nothing that is not one', () => {
      assert.deepEqual([...reached].sort(), chapters,
        'The table of contents and the directory disagree. A chapter with no link is content nobody can find\n'
        + `from the front door — including the reader who arrived at ${g.index} from the README.`);
    });

    it('lists the chapters in reading order', () => {
      // The numeric prefix is pedagogical, and a GitHub folder listing sorts alphabetically. A contents
      // page that contradicts the prefixes makes the numbering worse than useless.
      assert.deepEqual(reached, [...reached].sort(), 'the index must reach the chapters in their numbered order');
    });

    it('carries no content of its own', () => {
      // What "content" means here: anything a reader could act on, and therefore anything that can go stale
      // independently of the chapter that also states it.
      const offenders = [];
      if (/```/.test(text)) offenders.push('a fenced code block');
      if (/^\|/m.test(text)) offenders.push('a table');
      if (/\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\//.test(text)) offenders.push('an API endpoint');
      if (!g.groupsWithH3 && /^#{3,}\s/m.test(text)) offenders.push('a subsection heading (H3+)');
      if (g.groupsWithH3 && /^#{4,}\s/m.test(text)) offenders.push('a heading below the chapter grouping (H4+)');
      assert.deepEqual(offenders, [],
        `The ${g.name} index has grown content. Every statement belongs in exactly one chapter — a copy here\n`
        + 'is a second place to remember to edit, and the one that goes stale is whichever was not open.');
    });

    it('stays short enough to be obviously an index', () => {
      const lines = text.split(/\r?\n/).length;
      assert.ok(lines < g.maxLines, `the ${g.name} index is ${lines} lines — that is prose, not a contents page`);
    });

    it('every chapter points back at the index', () => {
      const back = `](../${g.index.replace('docs/', '')})`;
      const orphans = chapters.filter(f => !readFileSync(`${g.dir}/${f}`, 'utf8').includes(back));
      assert.deepEqual(orphans, [], `these chapters have no backlink to ${g.index}`);
    });
  });
}
