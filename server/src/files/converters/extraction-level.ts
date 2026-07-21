/**
 * Resolving the effective document-extraction level for a space.
 *
 * The instance setting is a **ceiling, not a default**: a space may choose anything up to it and
 * nothing beyond it. That asymmetry is deliberate — capability is granted centrally, while the
 * decision to use less of it stays with the space. Lowering the instance ceiling therefore caps every
 * space above it silently as far as the data is concerned, which is exactly why the UI has to show the
 * *effective* level rather than the stored one.
 *
 * `auto` is not a rung on the ladder, it is "as much as is allowed and possible". At the ceiling it
 * means the instance imposes no policy limit; for a space it means "follow the ceiling". The remaining
 * capability question — is a repair model actually wired in? — is answered later by `decideRoute`,
 * which is where availability lives.
 */
import { getDocumentProcessingConfig, getConfig } from '../../config/loader.js';
import { normalizeDocExtractionMode } from '../../config/types.js';
import type { DocExtractionMode } from '../../config/types.js';

/** The ladder, low to high. `auto` is deliberately absent — it resolves, it does not rank. */
const LADDER: readonly DocExtractionMode[] = ['off', 'ocr', 'vlm', 'repair'] as const;

/**
 * Cap a space's choice by the instance ceiling. Neither argument may be undefined-as-"unset" — the
 * caller decides what an absent value means, so this stays a pure lattice operation.
 */
export function capDocExtractionMode(ceiling: DocExtractionMode, choice: DocExtractionMode): DocExtractionMode {
  if (choice === 'auto') return ceiling;   // "as much as allowed"
  if (ceiling === 'auto') return choice;   // instance imposes no policy limit
  const ci = LADDER.indexOf(choice);
  const li = LADDER.indexOf(ceiling);
  if (ci < 0 || li < 0) return choice;     // unknown value — do not silently downgrade
  return ci <= li ? choice : ceiling;
}

/**
 * The level that actually applies to documents in `spaceId`: the space's own choice capped by the
 * instance ceiling, defaulting to `auto` at both ends (an unset space follows the ceiling; an unset
 * instance imposes no limit).
 */
export function effectiveDocExtractionMode(spaceId: string): DocExtractionMode {
  // getDocumentProcessingConfig already normalises the instance value; the per-space override is read
  // straight off the space record, so it gets the same treatment here — a space stored with the legacy
  // `max` must keep meaning `repair`, not fall through as an unknown rung.
  const ceiling = getDocumentProcessingConfig().mode ?? 'auto';
  const choice = normalizeDocExtractionMode(
    getConfig().spaces.find(s => s.id === spaceId)?.documentExtraction,
  ) ?? 'auto';
  return capDocExtractionMode(ceiling, choice);
}

/** True when documents in this space are not analysed at all. */
export function documentsAreOff(spaceId: string): boolean {
  return effectiveDocExtractionMode(spaceId) === 'off';
}
