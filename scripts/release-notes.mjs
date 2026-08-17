#!/usr/bin/env node
/**
 * Print the CHANGELOG body for a version, for `gh release create --notes-file`.
 *
 * Usage: node scripts/release-notes.mjs 3.1.0 [out.md]
 *
 * Exits non-zero and says why when the section is missing or empty, so `publish.yml` fails loudly rather
 * than creating a Release with an empty body. A release note that says nothing is worse than a missing one:
 * it asserts that nothing changed.
 *
 * ## Why this exists at all
 *
 * `publish.yml` pushed images on every `v*` tag and created no GitHub Release, and nothing noticed for six
 * versions — `v2.6.0` through `v3.0.1` shipped as images while the Releases page showed **2.5.1 as Latest
 * for five weeks**. The images were the half a machine consumes and the Release is the half a person reads,
 * and only one of them had a mechanism.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { changelogSection, sectionContentLines, releaseBody } from './changelog-section.mjs';

const version = process.argv[2];
const outPath = process.argv[3];

if (!version) {
  console.error('usage: node scripts/release-notes.mjs <version> [outfile]');
  process.exit(2);
}

const section = changelogSection(readFileSync('CHANGELOG.md', 'utf8'), version);
if (!section) {
  console.error(`No dated CHANGELOG section for ${version}. Expected a line like "## [${version}] — YYYY-MM-DD".`);
  console.error('The tag was pushed without closing [Unreleased] into a dated heading, so there are no notes to publish.');
  process.exit(1);
}

const content = sectionContentLines(section);
if (content.length < 3) {
  console.error(`The ${version} CHANGELOG section has ${content.length} content line(s).`);
  console.error('Publishing that as a release note would announce a version and describe none of it.');
  process.exit(1);
}

const body = releaseBody(section);
if (outPath) {
  writeFileSync(outPath, body + '\n', 'utf8');
  console.error(`wrote ${body.length} chars of notes for ${version} to ${outPath}`);
} else {
  process.stdout.write(body + '\n');
}
