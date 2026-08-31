/**
 * `CHANGELOG.md` holds the CURRENT major series only, and each archive is frozen.
 *
 * ## Why this exists
 *
 * The convention was already in place and already documented — `CHANGELOG.md`'s own header says it "covers the
 * **current major series**; earlier majors are archived under `changelog/`" — and 0.x and 1.x were archived
 * exactly that way, each with a Frozen note and a link back.
 *
 * **2.x never was.** All seventeen of its releases sat in the current file, which reached 17 082 lines while
 * claiming in its second sentence to cover one major. Nobody decided that; nothing checked it, so at the 3.0.0
 * cut the split simply did not happen, and every release after it made the file longer without making the
 * claim any truer. The owner noticed by opening the file.
 *
 * A documented convention with no gate holds exactly as well as remembering it does — the same lesson as the
 * working-order checklist, and the reason this is a test rather than a note in the release runbook.
 *
 * ## What it checks
 *
 * The current file may carry `[Unreleased]` plus releases of ONE major, and that major is the one
 * `package.json` is on — so the check fires at the moment a major is cut rather than a release later, which is
 * the only moment the split is cheap. Each archive must be frozen: no `[Unreleased]`, and no version outside
 * the major its filename names.
 *
 * Run: node --test testing/standalone/the-changelog-holds-one-major.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const CURRENT = 'CHANGELOG.md';
const ARCHIVE_DIR = 'changelog';

/** Every `## [x.y.z]` heading in a file, as its major. `[Unreleased]` is not a version. */
function majorsIn(src) {
  return [...src.matchAll(/^## \[(\d+)\.\d+\.\d+\]/gm)].map(m => Number(m[1]));
}

describe('the changelog holds one major, and the archives are frozen', () => {
  const current = readFileSync(CURRENT, 'utf8');
  const archives = readdirSync(ARCHIVE_DIR).filter(f => /^CHANGELOG-\d+\.x\.md$/.test(f));

  it('finds releases to check at all (the check itself works)', () => {
    // A regex that stopped matching would make every assertion below pass by examining nothing — the shape
    // this repo has shipped more than once.
    assert.ok(majorsIn(current).length >= 2, `expected several releases in ${CURRENT}`);
    assert.ok(archives.length >= 2, `expected archived majors in ${ARCHIVE_DIR}/`);
  });

  it('the current file carries exactly one major, and it is the one package.json is on', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const expected = Number(pkg.version.split('.')[0]);
    const found = [...new Set(majorsIn(current))].sort((a, b) => a - b);

    assert.deepEqual(found, [expected],
      `${CURRENT} should hold ${expected}.x only — found ${found.join(', ')}.\n\n`
      + `      Move the older major to ${ARCHIVE_DIR}/CHANGELOG-<n>.x.md with a Frozen note and a link back, and\n`
      + `      add a row to "Earlier releases". This is cheapest at the major cut and gets worse every release\n`
      + `      after it: 2.x was missed at 3.0.0 and the file reached 17 082 lines still claiming one series.`);
  });

  it('every archive is frozen — no [Unreleased], and nothing outside its own major', () => {
    for (const f of archives) {
      const src = readFileSync(`${ARCHIVE_DIR}/${f}`, 'utf8');
      const own = Number(f.match(/CHANGELOG-(\d+)\.x\.md/)[1]);

      assert.doesNotMatch(src, /^## \[Unreleased\]/m,
        `${f} has an [Unreleased] section — an archive is closed, so anything unreleased belongs in ${CURRENT}`);

      const strays = [...new Set(majorsIn(src))].filter(m => m !== own);
      assert.deepEqual(strays, [],
        `${f} carries ${strays.join(', ')}.x releases as well as its own`);
    }
  });

  it('and the current file links every archive, so none is orphaned', () => {
    /*
     * An archive nobody links to is a file that exists and cannot be found, which is worse than not splitting:
     * the history looks deleted rather than moved.
     */
    for (const f of archives) {
      assert.ok(current.includes(`${ARCHIVE_DIR}/${f}`),
        `${CURRENT} does not link ${f} — its releases are unreachable from the changelog anyone actually opens`);
    }
  });
});
