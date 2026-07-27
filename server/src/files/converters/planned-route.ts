/**
 * What WILL run for one file — the preview half of the per-file pipeline view.
 *
 * The live stage bar answers *"where is this file now"*. This answers the question that comes first and is
 * asked more often: *"why did nothing happen to my scan?"* Today that answer is only discoverable by
 * cross-referencing the file's type against Settings → Media Processing and then against the space's own
 * overrides — three places, none of which mention the file.
 *
 * ── Same stage vocabulary as the live bar ───────────────────────────────────────────────────────────────
 *
 * The stage names here are the ones the worker reports (`StepProgress.step`) and the ones the bar already
 * labels through `mediaProcessing.step.*`. That is deliberate: a preview that says "caption → embed" and a
 * running job that then reports `vlm` would be worse than no preview, because the user has no way to tell
 * which one is lying. For documents this is not merely a convention — the chain comes from `decideRoute`,
 * the very function the extractor runs.
 *
 * ── Why the other three classes needed a function written for them ──────────────────────────────────────
 *
 * `decideRoute` covers documents only. Images, audio and video had no equivalent: their chains were implied
 * by what `dispatch.ts` and the worker happen to call, and existed nowhere as data. They do now — and the
 * rung → stages mapping below is the ONLY place that knowledge lives, so the preview cannot drift from a
 * second copy.
 *
 * ── `willRun: false` is the valuable answer ─────────────────────────────────────────────────────────────
 *
 * A file that will be analysed is the boring case. The cases worth surfacing are the terminal ones
 * `dispatch.ts` already handles silently — the class is switched off for this space, or the file is over
 * the size cap — because those are exactly when a user is left staring at a file that never gains content
 * and never explains itself.
 */
import { resolveInputFormat, type ResolvedFormat } from './pipeline.js';
import { decideRoute, type CapabilityAvailability } from './extraction-policy.js';
import { effectiveDocExtractionMode } from './extraction-level.js';
import {
  effectiveImageLevel, effectiveAudioLevel, effectiveVideoLevel,
  faceRecognitionAllowed, videoDoesKeyframes,
} from './media-level.js';

/** Which ladder a file falls under. `document` covers every convertible text format. */
export type FileMediaClass = 'document' | 'image' | 'audio' | 'video';

export interface PlannedRoute {
  mediaClass: FileMediaClass;
  /** The effective rung for this class in this space — the space's choice already capped by the instance. */
  level: string;
  /** The stages that will run, in order, named as the worker reports them. Empty when nothing will run. */
  stages: string[];
  /** False when this file will be stored but not analysed at all. */
  willRun: boolean;
  /**
   * Why nothing will run, or why the plan is not what the configured rung implies. A **code**, not prose:
   * this is rendered in a UI that ships in three languages, and `decideRoute`'s `fallbackReason` is an
   * English sentence assembled for logs. The client translates the code; `detail` carries the original
   * text for operators, which is worth keeping because it names the specific missing capability.
   */
  reason?: 'level-off' | 'too-large' | 'fallback-ocr';
  /** The untranslated engine-side explanation, when there is one. Diagnostic, not UI copy. */
  detail?: string;
}

/** The classifier `dispatch.ts` uses, reduced to the four ladders. */
export function mediaClassOf(format: ResolvedFormat): FileMediaClass {
  if (format === 'image' || format === 'audio' || format === 'video') return format;
  return 'document';
}

/**
 * Stages for a non-document class at a given rung.
 *
 * Split out and pure so the mapping is testable without config, a space, or a file — the rung is the only
 * input that matters, and every branch of it can be checked directly.
 */
export function mediaStagesFor(
  cls: 'image' | 'audio' | 'video',
  level: string,
  opts: { faces?: boolean; keyframes?: boolean } = {},
): string[] {
  if (level === 'off') return [];
  if (cls === 'image') {
    // `caption` describes and embeds; `recognition` (and `auto`, which resolves to the most allowed) adds
    // face detection. Faces are additionally gated instance-wide, hence the explicit flag rather than a
    // second read of the ladder here.
    const stages = ['caption', 'embed'];
    if (opts.faces) stages.push('faces');
    return stages;
  }
  // Audio and video both reach embedding through a transcript; video may also sample keyframes first.
  const stages: string[] = [];
  if (cls === 'video' && opts.keyframes) stages.push('split');
  stages.push('transcribe', 'chunk', 'embed');
  return stages;
}

/**
 * The plan for one file in one space.
 *
 * `avail` is the capability picture (renderer, VLM, repair, verify wired in) — passed in rather than read
 * here so this stays callable from a route handler that already has it, and so a test can vary it.
 * `sizeBytes` is optional: when known, the size cap is applied exactly as `dispatch.ts` applies it.
 */
export function planFileRoute(
  spaceId: string,
  fileName: string,
  avail: CapabilityAvailability,
  opts: { sizeBytes?: number; maxBytes?: number } = {},
): PlannedRoute {
  const format = resolveInputFormat(fileName);
  const mediaClass = mediaClassOf(format);

  const level = mediaClass === 'document'
    ? effectiveDocExtractionMode(spaceId)
    : mediaClass === 'image' ? effectiveImageLevel(spaceId)
    : mediaClass === 'audio' ? effectiveAudioLevel(spaceId)
    : effectiveVideoLevel(spaceId);

  // Off is checked BEFORE size: a class that is switched off would not have run at any size, and reporting
  // "too large" for it would send someone to raise a limit that changes nothing.
  if (level === 'off') {
    return { mediaClass, level, stages: [], willRun: false, reason: 'level-off' };
  }
  if (opts.sizeBytes != null && opts.maxBytes != null && opts.sizeBytes > opts.maxBytes) {
    return { mediaClass, level, stages: [], willRun: false, reason: 'too-large' };
  }

  if (mediaClass === 'document') {
    const route = decideRoute(level as Parameters<typeof decideRoute>[0], avail);
    return {
      mediaClass, level, stages: [...route.stages], willRun: route.stages.length > 0,
      ...(route.fallbackReason ? { reason: 'fallback-ocr' as const, detail: route.fallbackReason } : {}),
    };
  }

  const stages = mediaStagesFor(mediaClass, level, {
    faces: mediaClass === 'image' && faceRecognitionAllowed(spaceId),
    keyframes: mediaClass === 'video' && videoDoesKeyframes(level as Parameters<typeof videoDoesKeyframes>[0]),
  });
  return { mediaClass, level, stages, willRun: stages.length > 0 };
}
