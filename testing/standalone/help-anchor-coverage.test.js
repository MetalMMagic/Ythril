/**
 * Every per-page help link points at a heading that actually exists.
 *
 * The failure this prevents makes no noise at all. A help control whose anchor does not resolve opens
 * the right guide, scrolls nowhere, and leaves the reader at the top of a 900-line document with no
 * indication that anything went wrong — which is exactly the state the whole help feature was built to
 * get out of. Renaming a heading in `docs/userguide.md` is an ordinary edit that does it.
 *
 * The slug is recomputed here from the real headings rather than imported, on purpose: this file is the
 * independent check on `headingSlug`, and importing the implementation would make it agree with itself.
 * The rule it encodes is GitHub's, which is the dialect the documents' own tables of contents use.
 *
 * Run: node --test testing/standalone/help-anchor-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ANCHORS_FILE = 'client/src/app/shared/help-anchors.ts';
const HELP_COMPONENT = 'client/src/app/pages/settings/help.component.ts';

/** GitHub's heading slug: lowercase, drop anything but word chars / space / hyphen, spaces to hyphens. */
const slug = text => text.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-');

/** Every ATX heading in a markdown file, as its anchor slug (with GitHub's duplicate suffixes). */
function anchorsOf(file) {
  const seen = new Map();
  const out = new Set();
  for (const line of readFileSync(`docs/${file}`, 'utf8').split('\n')) {
    const m = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (!m) continue;
    // Strip inline markdown so `## **Bold** heading` slugs the way it renders.
    const text = m[1].replace(/[*_`]/g, '');
    const base = slug(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

const anchorsSrc = readFileSync(ANCHORS_FILE, 'utf8');
/** Each `{ doc: 'x', anchor: 'y' }` in the table. */
const targets = [...anchorsSrc.matchAll(/doc:\s*'([^']+)',\s*anchor:\s*'([^']+)'/g)]
  .map(m => ({ doc: m[1], anchor: m[2] }));

const helpSrc = readFileSync(HELP_COMPONENT, 'utf8');
const docFiles = Object.fromEntries(
  [...helpSrc.matchAll(/id:\s*'([^']+)',\s*file:\s*'([^']+)'/g)].map(m => [m[1], m[2]]),
);

describe('per-page help links resolve to a real heading', () => {
  it('the table is not empty — an empty one would pass every check below', () => {
    assert.ok(targets.length > 0, `no help targets parsed out of ${ANCHORS_FILE}`);
  });

  it('every target names a guide the Help page offers', () => {
    for (const t of targets) {
      assert.ok(docFiles[t.doc], `help target doc '${t.doc}' is not in HELP_DOCS`);
    }
  });

  it('every anchor matches a heading in that guide', () => {
    const cache = new Map();
    for (const t of targets) {
      const file = docFiles[t.doc];
      if (!cache.has(file)) cache.set(file, anchorsOf(file));
      const available = cache.get(file);
      assert.ok(available.has(t.anchor),
        `docs/${file} has no heading slugging to '${t.anchor}' — the help link would scroll nowhere. ` +
        `Closest existing: ${[...available].filter(a => a.includes(t.anchor.split('-')[0])).slice(0, 5).join(', ') || '(none)'}`);
    }
  });
});

describe('the guides own internal links resolve too', () => {
  // The Help page renders the documents' own tables of contents; a dead entry there is the same silent
  // nothing-happens. This covers the userguide, which is the one a help link lands in.
  it('every intra-document anchor link in userguide.md points at one of its headings', () => {
    const available = anchorsOf('userguide.md');
    const links = [...readFileSync('docs/userguide.md', 'utf8').matchAll(/\]\(#([^)]+)\)/g)].map(m => m[1]);
    assert.ok(links.length > 0, 'expected userguide.md to contain a table of contents');
    const dead = links.filter(a => !available.has(a));
    assert.deepEqual(dead, [], 'these table-of-contents links point at no heading');
  });
});
