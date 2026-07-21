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
  IMAGE_LEVELS, AUDIO_LEVELS, VIDEO_LEVELS,
  type ImageLevel, type AudioLevel, type VideoLevel,
} from '../../config/types.js';

/** Ladders low to high. `auto` is deliberately excluded — it resolves, it does not rank. */
const LADDERS = {
  images: IMAGE_LEVELS.filter(l => l !== 'auto'),
  audio: AUDIO_LEVELS.filter(l => l !== 'auto'),
  video: VIDEO_LEVELS.filter(l => l !== 'auto'),
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
  const field = ({ images: 'imageAnalysis', audio: 'audioAnalysis', video: 'videoAnalysis' } as const)[cls];
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
 * Two gates, and both must allow it: the instance-wide `faceRecognition.enabled` (which infra can pin),
 * and the space being at the `recognition` rung. A space on `caption` gets described images and no face
 * data — which is the whole point of giving images their own ladder, since face embeddings are the
 * part of this pipeline with real privacy weight.
 */
export function faceRecognitionAllowed(spaceId: string): boolean {
  const level = effectiveImageLevel(spaceId);
  return level === 'recognition' || level === 'auto';
}
