/**
 * "What WILL run for this file" — the preview half of the per-file pipeline view.
 *
 * The live stage bar (#460) answers *where is this file now*. This answers the question asked first and
 * more often — *why did nothing happen to my scan?* — which today is only answerable by cross-referencing
 * the file's type against the instance's Media Processing settings and then against the space's overrides.
 *
 * What is pinned here is the part that is pure and therefore checkable without a database, a space, or a
 * sidecar: the rung → stages mapping for the three classes that never had one, and the classifier that
 * decides which ladder a file falls under. The space-dependent half (`planFileRoute`) reads live config,
 * so its config-driven branches belong in the Docker suite; what it must NOT do — invent stages for a
 * class that is switched off — is checked through the pure layer it delegates to.
 *
 * Run: node --test testing/standalone/planned-route.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let mediaStagesFor, mediaClassOf;

describe('planned route — which ladder a file falls under', () => {
  before(async () => {
    ({ mediaStagesFor, mediaClassOf } = await import('../../server/dist/files/converters/planned-route.js'));
  });

  it('routes the three media classes to themselves', () => {
    assert.equal(mediaClassOf('image'), 'image');
    assert.equal(mediaClassOf('audio'), 'audio');
    assert.equal(mediaClassOf('video'), 'video');
  });

  it('treats every convertible text format as one document ladder', () => {
    // pdf/docx/epub/html/md/txt all run the SAME extraction ladder — they differ in converter, not in rung.
    for (const f of ['pdf', 'docx', 'epub', 'html', 'md', 'txt', 'text']) {
      assert.equal(mediaClassOf(f), 'document', `${f} must follow the document ladder`);
    }
  });
});

describe('planned route — stages for the classes that never had a route function', () => {
  before(async () => {
    ({ mediaStagesFor } = await import('../../server/dist/files/converters/planned-route.js'));
  });

  it('runs nothing at all when the class is off', () => {
    // The whole point of `off`: stored, not analysed. Naming stages here would promise work that
    // dispatch.ts explicitly declines to enqueue.
    for (const cls of ['image', 'audio', 'video']) {
      assert.deepEqual(mediaStagesFor(cls, 'off'), [], `${cls} at 'off' must plan no stages`);
    }
  });

  it('describes an image as caption → embed, and adds faces only when they are allowed', () => {
    assert.deepEqual(mediaStagesFor('image', 'caption'), ['caption', 'embed']);
    assert.deepEqual(mediaStagesFor('image', 'recognition', { faces: true }), ['caption', 'embed', 'faces']);
    // Faces are gated instance-wide as well as by the rung; the rung alone must not promise them.
    assert.deepEqual(mediaStagesFor('image', 'recognition', { faces: false }), ['caption', 'embed'],
      'a rung that permits faces must not plan them when the instance has them pinned off');
  });

  it('reaches embedding through a transcript for audio and video', () => {
    assert.deepEqual(mediaStagesFor('audio', 'transcribe'), ['transcribe', 'chunk', 'embed']);
    assert.deepEqual(mediaStagesFor('video', 'transcribe'), ['transcribe', 'chunk', 'embed']);
  });

  it('samples keyframes first for video, and only for video', () => {
    assert.deepEqual(mediaStagesFor('video', 'full', { keyframes: true }), ['split', 'transcribe', 'chunk', 'embed']);
    assert.deepEqual(mediaStagesFor('audio', 'full', { keyframes: true }), ['transcribe', 'chunk', 'embed'],
      'keyframes are meaningless for audio and must not appear even if the flag is passed');
  });

  it('every reason code the planner can emit has a label in every locale', () => {
    // The template composes `files.plan.reason.` + code at runtime, so the static i18n coverage spec is
    // blind to these. An unlabelled code renders the raw key at the user — in the one place whose whole
    // job is explaining why nothing happened to their file.
    const CODES = ['level-off', 'too-large', 'fallback-ocr'];
    for (const loc of ['en', 'de', 'pl']) {
      const j = JSON.parse(readFileSync(new URL(`../../client/public/assets/i18n/${loc}.json`, import.meta.url), 'utf8'));
      const missing = CODES.filter(c => typeof j[`files.plan.reason.${c}`] !== 'string');
      assert.deepEqual(missing, [], `${loc} has no label for reason code(s): ${missing.join(', ')}`);
    }
  });

  it('every planned stage has a real label in every locale', () => {
    // Checked against the ACTUAL locale files, not a copied list — a hardcoded expectation here would go
    // stale silently, which is the exact failure mode being guarded against. A stage with no label renders
    // as a generic "working", so the preview would name some stages and shrug at others.
    const planned = new Set([
      ...mediaStagesFor('image', 'recognition', { faces: true }),
      ...mediaStagesFor('video', 'full', { keyframes: true }),
      ...mediaStagesFor('audio', 'transcribe'),
    ]);
    for (const loc of ['en', 'de', 'pl']) {
      const j = JSON.parse(readFileSync(new URL(`../../client/public/assets/i18n/${loc}.json`, import.meta.url), 'utf8'));
      const missing = [...planned].filter(s => typeof j[`mediaProcessing.step.${s}`] !== 'string');
      assert.deepEqual(missing, [], `${loc} has no label for: ${missing.join(', ')}`);
    }
  });
});
