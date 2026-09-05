/**
 * The CHANGELOG section for one version — one implementation, two callers.
 *
 * ## Why it is a module rather than a regex in each place
 *
 * `release-gate.mjs` already located a version's section to check it is dated and non-empty. `publish.yml`
 * now needs the same section as the body of a GitHub Release. Two copies of "where does this version's
 * section start and stop" is the defect this repo produces most, and here it has a specific failure mode:
 * the gate would keep passing on a correct CHANGELOG while the workflow published half of it, and nobody
 * compares a release body against anything.
 *
 * ## Bounded by the next heading, never by a count
 *
 * The 3.1.0 body is ~74 KB. A slice bounded by a character count would ship a truncated release note that
 * reads as complete — and a count spans different lines on a CRLF working copy than in CI's LF checkout,
 * so it would not even truncate in the same place twice.
 */

/** Match a dated release heading for `version`, e.g. `## [3.1.0] — 2026-08-17`. Both dash forms. */
export function headingFor(version) {
  return new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]\\s+[—-]\\s+(\\d{4}-\\d{2}-\\d{2})`, 'm');
}

/**
 * The whole section for `version`, heading included, or `null` when there is no dated heading for it.
 *
 * Line endings are normalised to `\n` first so the same offsets hold on either checkout.
 */
export function changelogSection(changelogText, version) {
  const text = changelogText.split(/\r?\n/).join('\n');
  const m = headingFor(version).exec(text);
  if (!m) return null;
  const start = m.index;
  // Search from start+1 so the section's OWN heading does not terminate it.
  const next = text.slice(start + 1).search(/^## \[/m);
  return next < 0 ? text.slice(start) : text.slice(start, start + 1 + next);
}

/**
 * The section's content lines — what the gate counts to refuse an empty release.
 *
 * Headings and blank lines are not content: a section holding nothing but `### Fixed` asserts that something
 * was fixed and names none of it, which is a stronger and falser statement than saying nothing at all.
 */
export function sectionContentLines(section) {
  return section.split('\n').slice(1).filter(l => l.trim() && !/^#{1,3} /.test(l.trim()));
}

/** The body for a release note: the section without its own `## [x.y.z] — date` heading line. */
export function releaseBody(section) {
  return section.split('\n').slice(1).join('\n').trim();
}

/**
 * GitHub's hard limit on a Release body. Documented, and enforced as a `422 Validation Failed`.
 *
 * Not a style choice and not ours to tune: the API refuses the call outright, after the images have already
 * been pushed. So the failure lands at the one step that runs LAST, with everything else published.
 */
export const RELEASE_BODY_MAX = 125_000;

/**
 * What we actually fill, with headroom under the hard limit.
 *
 * Filling to 124 871 of 125 000 left 129 characters of margin, and the two sides do not necessarily count
 * the same thing: this body is full of em-dashes and curly quotes, so its BYTE length is ~600 longer than
 * its character length. Being right about which one GitHub counts is not worth 129 characters, and the cost
 * of being wrong is the failure this whole function exists to remove — at the last step, after publishing.
 */
export const RELEASE_BODY_TARGET = 118_000;

/**
 * Fit a release body inside GitHub's limit, cutting at an ENTRY boundary and saying that it did.
 *
 * ## What this is for, measured
 *
 * `v4.0.0` was tagged, both registries took the image, and the Release step failed with
 * `422 body is too long (maximum is 125000 characters)` against **335 002 characters** of notes. Every
 * release before it fitted, so nothing had ever exercised a ceiling — the script had a FLOOR, refusing a
 * section too short to describe anything, and nothing at the other end.
 *
 * A major is where that breaks: 4.0.0 carries 221 entries because it carries everything since 3.0.0.
 *
 * ## Why the cut is at an entry boundary, and why it announces itself
 *
 * The module header already states the rule this obeys: *"a slice bounded by a character count would ship a
 * truncated release note that reads as complete"*. That is exactly the failure to avoid here, so the cut
 * lands between top-level entries and the body ends with a line saying how many were kept, how many there
 * are, and where the rest is. A reader who reaches the end knows they reached a boundary rather than the
 * end of the news.
 *
 * @param {string} body      the full release body
 * @param {string} version   the version, for the pointer at the end
 * @param {number} [limit]   the ceiling, overridable so a test can exercise this without a 335 KB fixture
 */
export function abridgeForRelease(body, version, limit = RELEASE_BODY_TARGET) {
  if (body.length <= limit) return body;

  const entries = body.split(/\n(?=- )/);
  const link = `https://github.com/ythril-network/Ythril/blob/v${version}/CHANGELOG.md`;

  /*
   * THE NOTICE GOES AT BOTH ENDS, and the top one is the one that matters.
   *
   * A reader who stops halfway — which is the likely reader of a body this size — never reaches a footer.
   * Told at the top, they know from the first line that this is a window onto the notes rather than all of
   * them, and where the rest is.
   */
  const head = (kept) => `> **These notes are abridged** — ${kept} of ${entries.length} entries. The full `
    + `${version} notes are in [CHANGELOG.md at this tag](${link}).\n\n`;
  const foot = (kept) => `\n\n---\n\n**End of the abridged notes** — ${kept} of ${entries.length} entries `
    + `shown. GitHub caps a release body at ${RELEASE_BODY_MAX.toLocaleString('en-US')} characters and the `
    + `full ${version} notes are ${body.length.toLocaleString('en-US')}. Read all of them in `
    + `[CHANGELOG.md at this tag](${link}).`;

  // Sized against the WORST case the notices can grow to, because their own numbers are part of their
  // length: sizing against the final count could push the body back over the limit it just fitted.
  const budget = limit - head(entries.length).length - foot(entries.length).length;

  const kept = [];
  let used = 0;
  for (const e of entries) {
    if (used + e.length + 1 > budget) break;
    kept.push(e);
    used += e.length + 1;
  }
  // A single entry longer than the whole budget would leave nothing. Better an honest pointer than a
  // mid-sentence cut — but say so, rather than returning a body that reads as though nothing changed.
  if (kept.length === 0) return `**These notes are too long to show here.** Read them in [CHANGELOG.md at this tag](${link}).`;

  return head(kept.length) + kept.join('\n') + foot(kept.length);
}
