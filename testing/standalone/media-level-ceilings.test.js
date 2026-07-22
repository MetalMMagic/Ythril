/**
 * Instance level CEILINGS — the write path.
 *
 * #356 built the ladders and the resolution rule; #361 drew them on the Pipelines tab, read-only,
 * because `PATCH /api/admin/media-config` had no `levels` schema. This is that schema, and these test
 * the two things about it that can go wrong quietly.
 *
 * The load-bearing one is the **per-class merge**. `{...existing, ...patch}` at the top level replaces
 * the whole `levels` object, and because `getMediaEmbeddingConfig()` defaults an absent class to
 * `auto`, the classes a patch did not mention would not merely be forgotten — they would come back as
 * `auto`. Saving a change to `images` alone would RAISE the ceiling on audio, video and text: a
 * capability grant nobody asked for, on the one setting whose whole job is to withhold capability.
 * Nothing would report it, and the only symptom is an instance quietly processing more than it was
 * told to.
 *
 * Run: node --test testing/standalone/media-level-ceilings.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { mergeLevelCeilings } = await import('../../server/dist/api/media-config.js');
const { capMediaLevel } = await import('../../server/dist/files/converters/media-level.js');
const { IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS } = await import('../../server/dist/config/types.js');

describe('mergeLevelCeilings — a patch must not touch classes it does not name', () => {
  const stored = { images: 'caption', audio: 'off', video: 'audio', text: 'embed' };

  it('changes only the named class', () => {
    assert.deepEqual(mergeLevelCeilings(stored, { images: 'recognition' }),
      { images: 'recognition', audio: 'off', video: 'audio', text: 'embed' });
  });

  it('THE ONE THAT MATTERS: an unnamed class keeps its ceiling rather than reverting to auto', () => {
    // A whole-object replace would drop audio/video/text here. They would not stay dropped — the
    // loader reads an absent class as `auto` — so every one of them would silently rise to the top
    // rung because an admin edited a different class.
    const out = mergeLevelCeilings(stored, { images: 'off' });
    assert.equal(out.audio, 'off', 'audio was silently raised');
    assert.equal(out.video, 'audio', 'video was silently raised');
    assert.equal(out.text, 'embed', 'text was silently raised');
  });

  it('an explicit undefined does not clear a stored ceiling', () => {
    // zod leaves absent optional keys undefined; treating that as a value would erase a ceiling the
    // client never mentioned — the same silent raise by another route.
    assert.deepEqual(mergeLevelCeilings(stored, { images: undefined, audio: 'on' }),
      { images: 'caption', audio: 'on', video: 'audio', text: 'embed' });
  });

  it('starts from nothing when no ceilings are stored yet', () => {
    assert.deepEqual(mergeLevelCeilings(undefined, { text: 'chunk' }), { text: 'chunk' });
  });

  it('does not mutate the stored object it was handed', () => {
    const before = { ...stored };
    mergeLevelCeilings(stored, { images: 'off' });
    assert.deepEqual(stored, before);
  });

  it('can lower every class in one patch', () => {
    assert.deepEqual(mergeLevelCeilings(stored, { images: 'off', audio: 'off', video: 'off', text: 'off' }),
      { images: 'off', audio: 'off', video: 'off', text: 'off' });
  });
});

describe('the ceiling values the API accepts are exactly the ladder', () => {
  // The PATCH enums are built FROM these constants rather than hand-written beside them. If someone
  // adds a rung to a ladder and forgets the API, this is what notices — a rung the resolver knows and
  // the API rejects is a level an operator can never actually select.
  it('every ladder rung survives a merge unchanged', () => {
    for (const [cls, ladder] of [['images', IMAGE_LEVELS], ['audio', AUDIO_LEVELS], ['video', VIDEO_LEVELS], ['text', TEXT_LEVELS]]) {
      for (const rung of ladder) {
        assert.equal(mergeLevelCeilings({}, { [cls]: rung })[cls], rung, `${cls}=${rung} did not survive`);
      }
    }
  });

  it('the ladders still contain the rungs the resolver relies on', () => {
    // A guard on the guard: if a ladder were emptied or renamed, the loop above would pass vacuously.
    assert.ok(IMAGE_LEVELS.includes('recognition') && IMAGE_LEVELS.includes('off'));
    assert.ok(AUDIO_LEVELS.includes('on') && AUDIO_LEVELS.includes('off'));
    assert.ok(VIDEO_LEVELS.includes('audio') && VIDEO_LEVELS.includes('full'));
    assert.ok(TEXT_LEVELS.includes('chunk') && TEXT_LEVELS.includes('embed'));
  });
});

describe('what an editable ceiling now does to spaces — the consequences worth stating', () => {
  // These exercise the production lattice directly. They are here because making ceilings editable
  // from the admin UI is what turns these from documentation into things an operator can trigger by
  // clicking, and the UI has to be honest about all three.

  it('lowering the ceiling caps a space above it, without changing what the space chose', () => {
    assert.equal(capMediaLevel('images', 'caption', 'recognition'), 'caption');
    // Raising it back restores the space to its own choice — the stored value was never touched.
    assert.equal(capMediaLevel('images', 'recognition', 'recognition'), 'recognition');
  });

  it("'off' is a floor as well as a ceiling — the class is off everywhere", () => {
    for (const choice of IMAGE_LEVELS) assert.equal(capMediaLevel('images', 'off', choice), 'off');
    for (const choice of TEXT_LEVELS) assert.equal(capMediaLevel('text', 'off', choice), 'off');
  });

  it('raising the ceiling does NOT raise a space that chose a specific lower rung', () => {
    // Capability grows centrally; consent stays local. Only `auto` spaces follow it upward.
    assert.equal(capMediaLevel('images', 'recognition', 'caption'), 'caption');
    assert.equal(capMediaLevel('images', 'recognition', 'auto'), 'recognition');
  });
});
