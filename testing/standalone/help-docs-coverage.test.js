/**
 * The in-product Help page offers every shipped guide — and every guide it offers actually ships.
 *
 * This is the gate for a failure with no error message. `HELP_DOCS` is a hand-written list (deliberately:
 * it is what keeps the document id out of any concatenated path, so there is no traversal surface), which
 * means the two ways it can rot are both silent:
 *
 *  1. A new file lands in `docs/` and nobody adds it here. The guide exists, ships in the image, and is
 *     unreachable from the product — the exact "you have to leave the UI" problem this page closed.
 *  2. A file is renamed or deleted and the entry stays. The build copies nothing, the fetch 404s, and the
 *     only person who finds out is the operator who clicked it.
 *
 * It also checks the pieces that make the assets appear at all — the angular.json glob and the
 * Dockerfile COPY. Without the COPY the glob resolves to nothing in the image and Help ships empty,
 * which no unit test of the component can see because the component is fine.
 *
 * Run: node --test testing/standalone/help-docs-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const HELP_COMPONENT = 'client/src/app/pages/settings/help.component.ts';
const src = readFileSync(HELP_COMPONENT, 'utf8');

/** The `file:` values listed in HELP_DOCS. */
const listed = [...src.matchAll(/file:\s*'([^']+)'/g)].map(m => m[1]);
/** The `id:` values, needed for the i18n check. */
const ids = [...src.matchAll(/id:\s*'([^']+)',\s*file:/g)].map(m => m[1]);

const shipped = readdirSync('docs').filter(f => f.endsWith('.md'));

describe('Help page — the offered guides and the shipped ones are the same set', () => {
  it('offers every markdown file in docs/', () => {
    const missing = shipped.filter(f => !listed.includes(f));
    assert.deepEqual(missing, [],
      `these guides ship but the Help page does not offer them — add them to HELP_DOCS in ${HELP_COMPONENT}`);
  });

  it('offers nothing that does not ship', () => {
    const dangling = listed.filter(f => !shipped.includes(f));
    assert.deepEqual(dangling, [],
      `HELP_DOCS points at files that are not in docs/ — the fetch would 404 for the operator who clicks it`);
  });

  it('gives every offered guide a title in all three locales', () => {
    // An unregistered key renders as the raw key — visible, but it looks like a bug rather than a guide.
    for (const locale of ['en', 'de', 'pl']) {
      const dict = JSON.parse(readFileSync(`client/public/assets/i18n/${locale}.json`, 'utf8'));
      for (const id of ids) {
        assert.ok(dict[`help.doc.${id}`], `${locale}.json is missing help.doc.${id}`);
      }
    }
  });
});

describe('Help page — the assets actually reach the build', () => {
  it('angular.json copies docs/*.md into the client assets', () => {
    const ng = readFileSync('client/angular.json', 'utf8');
    assert.ok(ng.includes('"input": "../docs"'),
      'the docs asset glob is gone — Help would render nothing, with no build error');
    assert.ok(ng.includes('assets/docs'), 'the docs assets must land under assets/docs, where the page fetches them');
  });

  it('the Dockerfile copies docs/ into the client build stage', () => {
    // The glob above is relative to client/, so without this COPY the image builds cleanly and ships a
    // Help page with nothing behind it.
    const df = readFileSync('Dockerfile', 'utf8');
    const clientStage = df.slice(0, df.indexOf('AS builder'));
    assert.ok(/COPY\s+docs\/\s+\.\/docs\//.test(clientStage),
      'the client build stage must COPY docs/ — otherwise the asset glob matches nothing in the image');
  });
});
