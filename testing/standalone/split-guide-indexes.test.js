/**
 * The two split guides' front doors are INDEXES and nothing else.
 *
 * `docs/integration-guide.md` and `docs/userguide.md` are both link lists now, with their real content in a
 * sibling directory of parts. The rules are the same and the shapes are not, so the checks are written per
 * guide rather than merged into one loop with four flags:
 *
 *  - the **integration guide** index links each part exactly once, in numbered order, with no fragments. It
 *    is a contents page for seventeen API references read one at a time.
 *  - the **user guide** index is a table of contents with anchors — twenty numbered entries pointing into
 *    six chapters, several entries per chapter. So "each part exactly once, in order" is the wrong
 *    assertion there; "every chapter reachable, nothing linked that is not one" is the right one.
 *
 * Merging them would have meant loosening the integration guide's assertion to whatever the userguide also
 * satisfies, which is how a gate quietly stops checking the thing it was written for.
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

const UG_INDEX = 'docs/userguide.md';
const UG_DIR = 'docs/userguide';

const ugIndex = readFileSync(UG_INDEX, 'utf8');
const ugParts = readdirSync(UG_DIR).filter(f => f.endsWith('.md')).sort();
/** Every `](userguide/<part>.md…)` target in the index, deduplicated — the TOC links several per chapter. */
const ugLinked = [...new Set([...ugIndex.matchAll(/\]\(userguide\/([^)#]+\.md)/g)].map(m => m[1]))].sort();

describe('the user guide index', () => {
  it('finds the chapters (the check itself works)', () => {
    assert.ok(ugParts.length >= 4, `expected the split guide's chapters, found ${ugParts.length}`);
  });

  it('reaches every chapter, and links nothing that is not one', () => {
    assert.deepEqual(ugLinked, ugParts,
      'The table of contents and the directory disagree. A chapter with no link is content nobody can find\n'
      + 'from the front door — including the reader who arrived at docs/userguide.md from the README.');
  });

  it('lists the chapters in reading order', () => {
    // The numeric prefix is pedagogical: logging in, then the brain, then settings, then connecting an
    // assistant. A table of contents that contradicts it makes the numbering worse than useless.
    const order = [...new Set([...ugIndex.matchAll(/\]\(userguide\/([^)#]+\.md)/g)].map(m => m[1]))];
    assert.deepEqual(order, [...order].sort(), 'the index must reach the chapters in their numbered order');
  });

  it('carries no content of its own', () => {
    // Same rule as the integration guide, minus the H2 restriction: this index's own section is called
    // "Table of Contents", and its entries are a numbered list rather than one line per file.
    const offenders = [];
    if (/```/.test(ugIndex)) offenders.push('a fenced code block');
    if (/^\|/m.test(ugIndex)) offenders.push('a table');
    if (/\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\//.test(ugIndex)) offenders.push('an API endpoint');
    if (/^#{3,}\s/m.test(ugIndex)) offenders.push('a subsection heading (H3+)');
    assert.deepEqual(offenders, [],
      'The user guide index has grown content. Every statement belongs in exactly one chapter — a copy here\n'
      + 'is a second place to remember to edit, and the one that goes stale is whichever was not open.');
  });

  it('stays short enough to be obviously an index', () => {
    const lines = ugIndex.split(/\r?\n/).length;
    assert.ok(lines < 80, `the user guide index is ${lines} lines — that is prose, not a contents page`);
  });

  it('every chapter points back at the index', () => {
    const orphans = ugParts.filter(f =>
      !readFileSync(`${UG_DIR}/${f}`, 'utf8').includes('](../userguide.md)'));
    assert.deepEqual(orphans, [], 'these chapters have no backlink to the index');
  });
});
