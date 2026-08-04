/**
 * The ffmpeg licensing claim and the shipped artefact must not drift apart — in EITHER direction.
 *
 * ## The failure this exists for
 *
 * The Dockerfile asserted *"ffmpeg: LGPL-2.1+ core only (no GPL codecs)"* and instructed the reader to verify
 * that `--enable-gpl` must be absent. Running that one command disproves it: Debian builds ffmpeg **with**
 * `--enable-gpl`, so the shipped binary is GPL-2.0-or-later. It reported the same on the released 2.2.5 image,
 * so the stated verification cannot ever have been run.
 *
 * Two documents that could not both be true, with the comment naming the command that settles it. The same
 * shape as every other finding in this audit round — and worse than most, because it was a **licensing** claim
 * on the primary distribution, and because ffmpeg was simultaneously the one bundled binary with **no NOTICE
 * entry at all** while every optional sidecar had a careful one.
 *
 * ## Why this gate is about the CLAIM, not the codecs
 *
 * It cannot run ffmpeg — no Docker in the offline suite. What it can do is stop the two files from disagreeing:
 * if someone later builds an LGPL-only ffmpeg (a legitimate option), they must update NOTICE in the same
 * change, and if someone re-adds a "no GPL" claim without doing that work, this fails.
 *
 * Comments are NOT stripped here, unusually: the Dockerfile comment IS the claim under test.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const dockerfile = readFileSync(join(ROOT, 'Dockerfile'), 'utf8');
const notice = readFileSync(join(ROOT, 'NOTICE'), 'utf8');

describe('the ffmpeg licensing claim matches what ships', () => {
  it('found both documents (guards against a vacuous pass)', () => {
    assert.match(dockerfile, /install[^\n]*ffmpeg/, 'the Dockerfile no longer installs ffmpeg — retire this gate');
    assert.ok(notice.length > 5000, 'NOTICE looks truncated');
  });

  it('ffmpeg is attributed in NOTICE at all', () => {
    // It was not, for the entire life of the feature. Every optional sidecar had an entry; the one GPL binary,
    // in the MAIN image, had none.
    assert.match(notice, /FFmpeg/i, 'ffmpeg ships in the image and must appear in NOTICE');
  });

  it('NOTICE names the licence Debian actually builds, not the one ffmpeg could have been', () => {
    const at = notice.search(/###[^\n]*FFmpeg/i);
    assert.ok(at > 0, 'no FFmpeg section heading in NOTICE');
    const section = notice.slice(at, notice.indexOf('\n### ', at + 5));
    assert.match(section, /General Public License v2\.0 or later|GPL-2\.0-or-later/,
      'Debian builds ffmpeg with --enable-gpl, so the shipped binary is GPL-2.0-or-later');
    assert.match(section, /--enable-gpl/, 'the section should name the flag, so a reader can verify it themselves');
  });

  it('NOTICE offers corresponding source for the binary', () => {
    // The separate-process argument covers Ythril's own code. It does not cover redistributing the binary.
    const at = notice.search(/###[^\n]*FFmpeg/i);
    const section = notice.slice(at, notice.indexOf('\n### ', at + 5));
    assert.match(section, /[Cc]orresponding source/, 'a GPL binary needs a corresponding-source offer');
    assert.match(section, /ffmpeg\.org|git\.ffmpeg\.org|sources\.debian\.org/,
      'the source offer must point somewhere real');
  });

  it('NOTICE records that it is a separate process, not linked', () => {
    const at = notice.search(/###[^\n]*FFmpeg/i);
    const section = notice.slice(at, notice.indexOf('\n### ', at + 5));
    assert.match(section, /separate process/i);
    assert.match(section, /not linked/i);
  });

  it('the Dockerfile does not claim ffmpeg is LGPL-only', () => {
    // The precise regression to prevent: re-asserting the comforting version without doing the work that would
    // make it true. Scoped to the ffmpeg RUN's own comment block, since NOTICE-adjacent text elsewhere in the
    // file legitimately discusses LGPL for other components.
    const at = dockerfile.search(/# ffmpeg, for the|# ffmpeg:/);
    assert.ok(at > 0, 'could not find the ffmpeg comment block — re-anchor this gate');
    const block = dockerfile.slice(at, dockerfile.indexOf('RUN apt-get', at));

    // QUOTED spans are removed before matching, and this gate had to learn it the hard way: the corrected
    // comment necessarily *quotes* the false claim in order to record that it was false, and the first version
    // of this assertion fired on that quotation. Stripping comments is not an option here — the comment IS the
    // claim under test — so the distinction has to be assertion vs. quotation instead.
    //
    // Ninth gate in this repo to fire on the prose explaining its own subject. The tempting "fix" every time is
    // to delete the explanation, which is precisely the wrong move.
    const unquoted = block.replace(/"[^"]*"|“[^”]*”/g, ' ');

    assert.doesNotMatch(unquoted, /LGPL-2\.1\+ core only|no GPL codecs/,
      'this claim is false for Debian ffmpeg. If an LGPL-only build is introduced, update NOTICE in the same '
      + 'change and then this assertion can be inverted. (Quoting the old claim to explain it is fine — put it '
      + 'in quotes.)');
    assert.match(block, /GPL-2\.0-or-later|General Public License/,
      'the comment must state the licence that actually ships');
  });

  it('the two documents agree', () => {
    // The invariant, stated once: whatever the Dockerfile says about ffmpeg's licence, NOTICE says the same.
    const claimsGpl = /GPL-2\.0-or-later|General Public License/.test(dockerfile.slice(
      dockerfile.search(/# ffmpeg, for the|# ffmpeg:/),
      dockerfile.indexOf('RUN apt-get', dockerfile.search(/# ffmpeg, for the|# ffmpeg:/)),
    ));
    const noticeGpl = /General Public License v2\.0 or later|GPL-2\.0-or-later/.test(notice);
    assert.equal(claimsGpl, noticeGpl,
      'the Dockerfile and NOTICE disagree about ffmpeg\'s licence — that disagreement is the original bug');
  });
});
