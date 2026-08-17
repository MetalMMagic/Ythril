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
