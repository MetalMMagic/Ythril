/**
 * A package's recorded version in `package-lock.json` must match the artefact it points at.
 *
 * ## The failure, which happened twice
 *
 * A release bumps four manifests. Three are one line each; the fourth is `package-lock.json`, where the
 * project's own version appears four times among twenty thousand lines of dependency records. So the bump
 * gets done with a find-and-replace on `"version": "<old>"` — and that string is not unique. Any dependency
 * that happens to sit at the version you are bumping *from* is rewritten too, while its `resolved` URL and
 * `integrity` hash go on describing the real artefact.
 *
 * The 2.3.0 → 2.4.0 release did exactly this and left **seven** dependencies claiming 2.4.0 while resolving
 * to 2.3.0 tarballs. It shipped that way for three releases. The 2.5.1 → 2.6.0 bump reproduced it live on
 * `watchpack`, which is what made the old damage visible.
 *
 * ## Why nothing else catches it
 *
 * `npm ci` installs from `resolved` and verifies `integrity`, so the wrong `version` field never breaks an
 * install — it is a lie that works. What reads the field instead is everything that reports *about* the
 * dependency tree: SBOMs, licence and attribution tooling, `npm ls`, vulnerability matching. A CVE that
 * applies to 2.3.0 does not match a record that says 2.4.0.
 *
 * ## The check
 *
 * Every entry with a `resolved` tarball URL states its version in that URL, by npm's own naming convention.
 * Comparing the two costs nothing and needs no network. Entries without a `resolved` (workspaces, link
 * targets) are the project's own packages and are covered by the release gate's four-manifest check.
 *
 * Run: node --test testing/standalone/lockfile-versions-are-real.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const LOCK = 'package-lock.json';

/** The version npm encoded in a tarball URL: `…/name-1.2.3.tgz`, including prerelease suffixes. */
function versionFromResolved(resolved) {
  const m = /-(\d+\.\d+\.\d+[^/]*)\.tgz$/.exec(resolved);
  return m ? m[1] : null;
}

function entries() {
  const lock = JSON.parse(readFileSync(LOCK, 'utf8'));
  return Object.entries(lock.packages ?? {});
}

describe('the check itself works before it is trusted', () => {
  it('reads a lockfile with a real dependency tree in it', () => {
    // A parse that found nothing would make the assertion below vacuously true.
    const all = entries();
    assert.ok(all.length > 500, `only ${all.length} entries in ${LOCK} — the lockfile did not parse`);
    assert.ok(all.filter(([, v]) => v.resolved).length > 500, 'no entries carry a resolved URL');
  });

  it('extracts the version npm put in a tarball URL', () => {
    assert.equal(versionFromResolved('https://registry.npmjs.org/tapable/-/tapable-2.3.0.tgz'), '2.3.0');
    assert.equal(versionFromResolved('https://registry.npmjs.org/@ampproject/remapping/-/remapping-2.3.0.tgz'), '2.3.0');
    // A scoped package whose name itself contains digits and dashes must not confuse the suffix match.
    assert.equal(versionFromResolved('https://registry.npmjs.org/@peculiar/asn1-schema/-/asn1-schema-2.6.0.tgz'), '2.6.0');
    assert.equal(versionFromResolved('https://registry.npmjs.org/foo/-/foo-1.2.3-beta.4.tgz'), '1.2.3-beta.4');
    assert.equal(versionFromResolved('git+ssh://git@github.com/x/y.git#abc'), null, 'a non-tarball must be skipped, not guessed');
  });

  it('WOULD report a mismatch', () => {
    // Mutation-check on the comparison rather than on the file: a check that cannot fire looks exactly like
    // a clean lockfile, and this one has been clean-looking through three releases while being wrong.
    const planted = [['node_modules/x', { version: '9.9.9', resolved: 'https://registry.npmjs.org/x/-/x-1.0.0.tgz' }]];
    const bad = planted.filter(([, v]) => versionFromResolved(v.resolved) && versionFromResolved(v.resolved) !== v.version);
    assert.equal(bad.length, 1, 'the comparison must flag a version that disagrees with its tarball');
  });
});

describe('every locked version describes the artefact it resolves to', () => {
  it('has no dependency whose version disagrees with its tarball URL', () => {
    const wrong = entries()
      .map(([name, v]) => ({ name, version: v.version, url: versionFromResolved(v.resolved ?? '') }))
      .filter((e) => e.url && e.version !== e.url)
      .map((e) => `${e.name}: records ${e.version}, resolves to ${e.url}`);
    assert.deepEqual(wrong, [],
      'These lockfile entries claim a version their own tarball contradicts:\n  ' + `${wrong.join('\n  ')}\n\n`
      + 'Almost certainly a release bump done with a find-and-replace on `"version": "<old>"`, which is not a\n'
      + 'unique string — any dependency sitting at the version you bumped FROM is rewritten with it.\n'
      + '`npm ci` will not notice, because it installs from `resolved` and checks `integrity`; what breaks is\n'
      + 'everything that reports about the tree — SBOMs, attribution, and CVE matching against a version that\n'
      + 'was never installed.');
  });
});
