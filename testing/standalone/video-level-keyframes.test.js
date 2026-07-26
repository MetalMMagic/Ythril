/**
 * Standalone unit tests for the video level → keyframe-path policy (`videoDoesKeyframes`).
 *
 * Item 20 made the video level actually control the pipeline: `audio` takes the audio pipeline only
 * (transcribe, no vision model), while `full`/`auto` add keyframe captioning. Before this, keyframes
 * always ran and the `audio` level did nothing. Pure (no DB), so the whole mapping is checked here.
 *
 * Run: node --test testing/standalone/video-level-keyframes.test.js
 * (requires a prior `npm run build` in server/ so server/dist exists)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { videoDoesKeyframes } from '../../server/dist/files/converters/media-level.js';

describe('videoDoesKeyframes — video level controls the vision-model path', () => {
  it('`audio` → no keyframes (audio pipeline only, no vision model)', () => {
    assert.equal(videoDoesKeyframes('audio'), false);
  });

  it('`full` → keyframes (audio + vision captions)', () => {
    assert.equal(videoDoesKeyframes('full'), true);
  });

  it('`auto` → keyframes (as much as possible = full)', () => {
    assert.equal(videoDoesKeyframes('auto'), true);
  });

  it('`off` → no keyframes (defensive; dispatch skips off videos before this runs)', () => {
    assert.equal(videoDoesKeyframes('off'), false);
  });
});
