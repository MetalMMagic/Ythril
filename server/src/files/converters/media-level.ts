/**
 * Effective analysis level per media class (images / audio / video).
 *
 * Same contract documents already follow: the instance setting is a **ceiling, not a default**, a space
 * may choose anything up to it and nothing beyond it, and `auto` means "as much as is allowed and
 * possible". The capability question — is a vision model actually configured? — is answered by the
 * pipeline, not here; this module only resolves policy.
 *
 * The cap is one generic lattice operation rather than four copies, because four copies is how the
 * ladders drift apart: a class quietly gaining "raising the ceiling also raises every space" while the
 * others keep the opposite rule is exactly the kind of divergence nobody notices until a space starts
 * processing something its owner turned off.
 */
import { getConfig, getMediaEmbeddingConfig } from '../../config/loader.js';
import {
  IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS, TEXT_LEVELS,
  type ImageLevel, type AudioLevel, type VideoLevel, type TextLevel,
} from '../../config/types.js';

/** Ladders low to high. `auto` is deliberately excluded — it resolves, it does not rank. */
const LADDERS = {
  images: IMAGE_LEVELS.filter(l => l !== 'auto'),
  audio: AUDIO_LEVELS.filter(l => l !== 'auto'),
  video: VIDEO_LEVELS.filter(l => l !== 'auto'),
  // Text is not a media type, but it is the same policy question — how much of this class do we
  // process — so it shares the ceiling machinery rather than growing a parallel copy of it.
  text: TEXT_LEVELS.filter(l => l !== 'auto'),
} as const;

export type MediaClass = keyof typeof LADDERS;

/**
 * Cap a space's choice by the instance ceiling.
 *
 * - `auto` as the choice  → follow the ceiling ("as much as allowed").
 * - `auto` as the ceiling → the instance imposes no policy limit, so the choice stands.
 * - anything above the ceiling → capped. The space KEEPS its stored choice and returns to it if the
 *   ceiling rises again; only the effective value moves.
 * - an unrecognised value → returned untouched. Silently downgrading something we failed to parse is
 *   how a class ends up analysing less than an operator asked for with nothing reporting it.
 */
export function capMediaLevel<L extends string>(cls: MediaClass, ceiling: L, choice: L): L {
  if (choice === 'auto') return ceiling;
  if (ceiling === 'auto') return choice;
  const ladder = LADDERS[cls] as readonly string[];
  const ci = ladder.indexOf(choice);
  const li = ladder.indexOf(ceiling);
  if (ci < 0 || li < 0) return choice;
  return ci <= li ? choice : ceiling;
}

function ceilingFor(cls: MediaClass): string {
  const levels = getMediaEmbeddingConfig().levels ?? {};
  return (levels as Record<string, string | undefined>)[cls] ?? 'auto';
}

function spaceChoiceFor(cls: MediaClass, spaceId: string): string {
  const space = getConfig().spaces.find(s => s.id === spaceId);
  if (!space) return 'auto';
  const field = ({
    images: 'imageAnalysis', audio: 'audioAnalysis', video: 'videoAnalysis', text: 'textAnalysis',
  } as const)[cls];
  return (space as unknown as Record<string, string | undefined>)[field] ?? 'auto';
}

export function effectiveImageLevel(spaceId: string): ImageLevel {
  return capMediaLevel('images', ceilingFor('images'), spaceChoiceFor('images', spaceId)) as ImageLevel;
}

export function effectiveAudioLevel(spaceId: string): AudioLevel {
  return capMediaLevel('audio', ceilingFor('audio'), spaceChoiceFor('audio', spaceId)) as AudioLevel;
}

export function effectiveVideoLevel(spaceId: string): VideoLevel {
  return capMediaLevel('video', ceilingFor('video'), spaceChoiceFor('video', spaceId)) as VideoLevel;
}

/**
 * Whether video embedding runs the keyframe-captioning path (the vision model) on top of the audio
 * pipeline. Pure so the level→path policy is unit-testable without a database.
 *
 *   `audio` → transcribe the audio track only — video "takes the audio pipeline instead of a model".
 *   `full`  → audio + keyframe captions via the vision model.
 *   `auto`  → as much as possible, i.e. full (keyframes).
 *   `off`   → never reached here (dispatch records 'skipped' before enqueuing).
 */
export function videoDoesKeyframes(level: VideoLevel): boolean {
  return level === 'full' || level === 'auto';
}

/**
 * How text content is indexed for this space, low to high:
 *
 *   off    stored, never indexed — nothing in it is findable by search
 *   embed  one vector for the whole document: cheap, and enough to find the FILE
 *   chunk  a vector per section: finds the PASSAGE, which is what makes recall quotable
 *   auto   as much as possible, i.e. chunk
 *
 * Applies to converted documents and plain text alike — Documents governs how a file is READ,
 * this governs what is done with the text that comes out.
 */
export function effectiveTextLevel(spaceId: string): TextLevel {
  return capMediaLevel('text', ceilingFor('text'), spaceChoiceFor('text', spaceId)) as TextLevel;
}

/**
 * True when this media type is not analysed at all for this space.
 *
 * The caller records a terminal `skipped` rather than enqueuing a job: work that will do nothing
 * still leaves the file at `pending` forever, which looks exactly like a stuck queue — a spinner that
 * never resolves and recall that returns nothing, with neither saying why.
 */
export function mediaIsOff(spaceId: string, mediaType: 'image' | 'audio' | 'video'): boolean {
  if (mediaType === 'image') return effectiveImageLevel(spaceId) === 'off';
  if (mediaType === 'audio') return effectiveAudioLevel(spaceId) === 'off';
  return effectiveVideoLevel(spaceId) === 'off';
}

/**
 * Whether faces may be detected/embedded for this space.
 *
 * The ladder is the gate: a space must sit at the `recognition` rung (or `auto`, which resolves to it)
 * under an instance ceiling that permits it. A space on `caption` gets described images and no face
 * data — the whole point of giving images their own ladder, since face embeddings are the part of this
 * pipeline with real privacy weight. That is also why images DEFAULT to `caption`: a biometric store
 * should be something an operator opts into, never something an install hands them.
 *
 * There is one more gate, and it is deliberately NOT here: `faceRecognition.enabled`, the infra/env pin
 * (`FACE_RECOGNITION_ENABLED=false`), is checked by the caller in `image-embedder.ts` so infrastructure
 * can hard-disable the feature regardless of any ladder. This function answers the policy question only.
 */
export function faceRecognitionAllowed(spaceId: string): boolean {
  const level = effectiveImageLevel(spaceId);
  return level === 'recognition' || level === 'auto';
}
