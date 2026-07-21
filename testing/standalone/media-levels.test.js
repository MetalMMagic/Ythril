/**
 * Per-class media analysis levels (images / audio / video) — the ceiling lattice, pure.
 *
 * Same contract documents follow: the instance setting is a CEILING, not a default. A space may
 * choose anything up to it and nothing beyond it; `auto` means "as much as is allowed"; `off` means
 * the file is stored but never analysed.
 *
 * The cap is one generic operation rather than four copies, and these tests exist mostly to keep it
 * that way — four hand-written ladders is how one class quietly acquires "raising the ceiling also
 * raises every space" while the others keep the opposite rule, and nobody notices until a space starts
 * processing something its owner switched off.
 *
 * Run: node --test testing/standalone/media-levels.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { capMediaLevel } from '../../server/dist/files/converters/media-level.js';

describe('capMediaLevel — images', () => {
  it('a space may choose anything at or below the ceiling', () => {
    assert.equal(capMediaLevel('images', 'recognition', 'off'), 'off');
    assert.equal(capMediaLevel('images', 'recognition', 'caption'), 'caption');
    assert.equal(capMediaLevel('images', 'recognition', 'recognition'), 'recognition');
  });

  it('a choice above the ceiling is capped — this is the privacy-relevant one', () => {
    // An instance that allows captioning but not face recognition must not have a space opt itself
    // into face embeddings. That is the whole reason images have their own ladder.
    assert.equal(capMediaLevel('images', 'caption', 'recognition'), 'caption');
  });

  it("instance 'off' is a floor as well as a ceiling", () => {
    for (const choice of ['off', 'caption', 'recognition', 'auto']) {
      assert.equal(capMediaLevel('images', 'off', choice), 'off');
    }
  });

  it("a space on 'auto' follows the ceiling wherever it moves", () => {
    assert.equal(capMediaLevel('images', 'caption', 'auto'), 'caption');
    assert.equal(capMediaLevel('images', 'recognition', 'auto'), 'recognition');
    assert.equal(capMediaLevel('images', 'off', 'auto'), 'off');
  });

  it('raising the ceiling does not raise a space that chose a lower rung', () => {
    // Capability grows centrally; the decision to use less of it stays local.
    assert.equal(capMediaLevel('images', 'recognition', 'caption'), 'caption');
  });
});

describe('capMediaLevel — audio and video', () => {
  it('audio is a two-rung ladder and behaves like the others', () => {
    assert.equal(capMediaLevel('audio', 'on', 'off'), 'off');
    assert.equal(capMediaLevel('audio', 'off', 'on'), 'off');
    assert.equal(capMediaLevel('audio', 'on', 'auto'), 'on');
  });

  it('video caps full down to audio', () => {
    assert.equal(capMediaLevel('video', 'audio', 'full'), 'audio');
    assert.equal(capMediaLevel('video', 'full', 'audio'), 'audio');
    assert.equal(capMediaLevel('video', 'full', 'auto'), 'full');
  });
});

describe('capMediaLevel — invariants that hold for every class', () => {
  const CASES = [
    ['images', ['off', 'caption', 'recognition']],
    ['audio', ['off', 'on']],
    ['video', ['off', 'audio', 'full']],
  ];

  it('an unrecognised value is never silently downgraded', () => {
    for (const [cls] of CASES) {
      assert.equal(capMediaLevel(cls, 'off', 'something-new'), 'something-new');
    }
  });

  it("an 'auto' ceiling imposes no policy limit", () => {
    for (const [cls, rungs] of CASES) {
      for (const rung of rungs) assert.equal(capMediaLevel(cls, 'auto', rung), rung);
    }
  });

  it('capping is idempotent — applying it twice changes nothing', () => {
    for (const [cls, rungs] of CASES) {
      for (const ceiling of rungs) {
        for (const choice of rungs) {
          const once = capMediaLevel(cls, ceiling, choice);
          assert.equal(capMediaLevel(cls, ceiling, once), once, `${cls}: ${ceiling}/${choice}`);
        }
      }
    }
  });

  it('the effective level never exceeds the ceiling, for every pair', () => {
    for (const [cls, rungs] of CASES) {
      for (const ceiling of rungs) {
        for (const choice of [...rungs, 'auto']) {
          const effective = capMediaLevel(cls, ceiling, choice);
          assert.ok(
            rungs.indexOf(effective) <= rungs.indexOf(ceiling),
            `${cls}: ceiling=${ceiling} choice=${choice} produced ${effective}, which is above the ceiling`,
          );
        }
      }
    }
  });
});
