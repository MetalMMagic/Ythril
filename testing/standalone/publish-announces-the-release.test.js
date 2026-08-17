/**
 * Publishing a tag creates the GitHub Release, and its notes come from the CHANGELOG.
 *
 * ## What this is for
 *
 * `publish.yml` triggers on `v*`, builds, and pushes to both registries — correctly, every time. It did not
 * create a **GitHub Release**, and nothing else did either, so `v2.6.0`, `v2.7.0`, `v2.8.0`, `v2.8.1`,
 * `v3.0.0` and `v3.0.1` all shipped as images with no entry on the Releases page. It showed **2.5.1 from
 * 2026-08-07 as Latest** for six versions and five weeks, which for anyone watching read as a project that
 * had stopped.
 *
 * Nothing noticed because nothing was watching for an ABSENCE. Every existing check asked whether a thing
 * that happened was correct; none asked whether a thing had happened at all. Found by hand while cutting
 * 3.1.0 — `gh release list` beside `git tag`.
 *
 * ## Gated on the RULE
 *
 * The section extraction is exercised by calling it, not grepped: a release body is the one artefact nobody
 * proof-reads, and a truncating slice would ship notes that read as complete. The workflow assertions are
 * about the properties that were wrong or that are easy to get wrong — the permission, the ordering, and
 * `--latest` being a decision rather than a default.
 *
 * Run: node --test testing/standalone/publish-announces-the-release.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { changelogSection, sectionContentLines, releaseBody } from '../../scripts/changelog-section.mjs';

const wf = readFileSync('.github/workflows/publish.yml', 'utf8');
const changelog = readFileSync('CHANGELOG.md', 'utf8');

describe('the section extraction is one implementation, and it is bounded structurally', () => {
  it('finds a real release and stops at the next heading', () => {
    const s = changelogSection(changelog, '3.1.0');
    assert.ok(s, 'no 3.1.0 section — this gate is measuring nothing');
    assert.match(s, /^## \[3\.1\.0\]/, 'starts at its own heading');
    assert.equal((s.match(/^## \[/gm) ?? []).length, 1,
      'the section swallowed a later release — it must stop at the next `## [` heading');
    assert.doesNotMatch(s, /^## \[3\.0\.1\]/m, 'and specifically not reach the previous release');
  });

  it('the body drops the heading and keeps everything else', () => {
    const s = changelogSection(changelog, '3.1.0');
    const body = releaseBody(s);
    assert.doesNotMatch(body, /^## \[3\.1\.0\]/, 'the heading is the Release title, not part of its notes');
    assert.ok(body.length > 1000,
      `the 3.1.0 notes came out ${body.length} chars. A truncating extraction ships notes that read as `
      + 'complete, which is the failure a character-bounded slice would produce and nobody would proof-read.');
  });

  it('a version with no dated heading returns null rather than a wrong section', () => {
    // The failure that matters: a tag pushed without closing `[Unreleased]`. Returning the NEXT section
    // would publish another release's notes under this version's name.
    assert.equal(changelogSection(changelog, '99.99.99'), null);
    assert.equal(changelogSection('## [Unreleased]\n\n### Fixed\n\n- a thing\n', '3.1.0'), null,
      'an undated [Unreleased] is not a release section');
  });

  it('content lines ignore headings, so an empty section cannot pass as full', () => {
    const empty = '## [9.9.9] — 2026-01-01\n\n### Fixed\n\n### Changed\n';
    assert.equal(sectionContentLines(empty).length, 0,
      'a section holding only headings claims something changed and names none of it');
    assert.ok(sectionContentLines(changelogSection(changelog, '3.1.0')).length >= 3);
  });
});

describe('the workflow announces what it published', () => {
  it('creates a Release', () => {
    assert.match(wf, /gh release create/,
      'publish.yml pushes images and never announces them — six tags shipped invisibly that way');
    assert.match(wf, /release-notes\.mjs/,
      'the notes must come from the CHANGELOG, not be typed into the workflow');
  });

  it('has the permission to do it', () => {
    // The reason it never existed: `contents: read` cannot create a Release, and a missing permission fails
    // at the API rather than at review time.
    const perms = wf.slice(wf.indexOf('permissions:'), wf.indexOf('jobs:'));
    assert.match(perms, /contents:\s*write/,
      'contents: write is required to create a Release; with `read` the step fails at the API');
  });

  it('announces LAST — after the image and after the licence checks', () => {
    // A Release is an announcement. Announcing a build that then fails its own NOTICE verification is worse
    // than announcing nothing, so the ordering is the assertion rather than a comment.
    const create = wf.indexOf('gh release create');
    const push = wf.indexOf('Build and push');
    const notice = wf.indexOf('Verify the licence and notices are in the published image');
    assert.ok(push > -1 && notice > -1, 'the workflow changed shape — this gate is measuring nothing');
    assert.ok(create > push, 'the Release must come after the image is pushed');
    assert.ok(create > notice, 'and after the published image passes its licence checks');
  });

  it('treats `--latest` as a decision, not a default', () => {
    // `gh` marks a new release latest unless told otherwise. Correct for a forward release, wrong for a
    // backfilled older one — that would announce a superseded version as newest, which is precisely what
    // filling the six-release backlog would do.
    assert.match(wf, /--latest="?\$\{?LATEST/,
      'the workflow must pass an explicit --latest computed from whether this tag is the highest');
    assert.match(wf, /git tag --list 'v\*' --sort=-v:refname/,
      'and compute it from the tags rather than assuming the newest push is the newest version');
  });

  it('re-running a tag updates the notes instead of failing the publish', () => {
    // `gh release create` errors when the release exists. A re-run — a retried publish, a re-pushed tag —
    // would then fail AFTER the images were already pushed, reporting a broken release for a build that
    // succeeded.
    assert.match(wf, /gh release view .* >\/dev\/null 2>&1/,
      'the step must check for an existing Release');
    assert.match(wf, /gh release edit/, 'and update it rather than erroring');
  });
});
