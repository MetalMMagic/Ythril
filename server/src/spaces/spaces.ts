/**
 * Space settings — update (label/description/meta/dupe rules) and display ordering.
 *
 * The heavy machinery now lives beside this file (A17.7): `vector-index.ts` (Atlas $vectorSearch),
 * `lifecycle.ts` (init/create/remove/wipe/recovery), `rename.ts`, and `_shared.ts`.
 */
import { getConfig, saveConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import type { SpaceConfig, SpaceMeta, DupeActionRule, DocExtractionMode, ImageLevel, AudioLevel, VideoLevel } from '../config/types.js';
import { buildSpaceVectorIndexes } from './vector-index.js';
import { syncSchemaFiles, META_VERSION_CAP } from './_shared.js';

/** Update mutable fields (label, description, meta) of an existing space in config.
 *  When `meta` is provided the version counter is auto-incremented and the
 *  previous version is pushed to `previousVersions` (capped at META_VERSION_CAP).
 *  Returns the updated SpaceConfig, or null if the space was not found. */
export function updateSpace(
  spaceId: string,
  updates: { label?: string; description?: string; maxGiB?: number | null; meta?: SpaceMeta; dupeRules?: DupeActionRule[]; dupeMergeSurvivor?: 'older' | 'newer'; dupeRulesOnInsert?: boolean; recordTtlDays?: number | null; documentExtraction?: DocExtractionMode | null; imageAnalysis?: ImageLevel | null; audioAnalysis?: AudioLevel | null; videoAnalysis?: VideoLevel | null },
): SpaceConfig | null {
  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  if (!space) return null;
  if (typeof updates.label === 'string') space.label = updates.label;
  if (typeof updates.description === 'string') space.description = updates.description;
  if (updates.maxGiB !== undefined) {
    // null or non-positive clears the cap (unlimited); positive number sets the cap
    space.maxGiB = updates.maxGiB !== null && updates.maxGiB > 0 ? updates.maxGiB : undefined;
  }
  // Duplicate-action rules are local (not governed) — apply immediately.
  if (updates.dupeRules !== undefined) {
    space.dupeRules = updates.dupeRules.length > 0 ? updates.dupeRules : undefined;
  }
  if (updates.dupeMergeSurvivor !== undefined) {
    space.dupeMergeSurvivor = updates.dupeMergeSurvivor;
  }
  if (updates.dupeRulesOnInsert !== undefined) {
    space.dupeRulesOnInsert = updates.dupeRulesOnInsert || undefined;
  }
  // F10 auto-TTL — local operational setting; `in` so an explicit clear (undefined) removes it.
  if ('recordTtlDays' in updates) {
    space.recordTtlDays = updates.recordTtlDays && updates.recordTtlDays > 0 ? updates.recordTtlDays : undefined;
  }
  // F11-c per-space extraction-mode override — local operational setting; `in` so an explicit clear removes it.
  if ('documentExtraction' in updates) {
    space.documentExtraction = updates.documentExtraction ?? undefined;
  }
  // The other media ladders, same contract: local/operational, `in` so an explicit clear removes it.
  if ('imageAnalysis' in updates) space.imageAnalysis = updates.imageAnalysis ?? undefined;
  if ('audioAnalysis' in updates) space.audioAnalysis = updates.audioAnalysis ?? undefined;
  if ('videoAnalysis' in updates) space.videoAnalysis = updates.videoAnalysis ?? undefined;

  if (updates.meta !== undefined) {
    const now = new Date().toISOString();
    const prev = space.meta;
    const prevVersion = prev?.version ?? 0;
    const newVersion = prevVersion + 1;

    // Preserve previous version history (capped)
    const history = prev?.previousVersions ?? [];
    if (prev) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { previousVersions: _drop, ...snapshot } = prev;
      history.unshift({ version: prevVersion, meta: snapshot, updatedAt: prev.updatedAt ?? now });
      if (history.length > META_VERSION_CAP) history.length = META_VERSION_CAP;
    }

    space.meta = {
      ...updates.meta,
      version: newVersion,
      updatedAt: now,
      previousVersions: history.length > 0 ? history : undefined,
    };

    // P6: a change to the type schemas may add or remove filterable `properties.*` paths, so the
    // $vectorSearch indexes must be re-shaped to match. Rebuild off the request path
    // (`waitForReady:false`); `ensureVectorSearchIndex` diffs each index's definition and only
    // touches the ones whose filter-field set actually changed. Gated on the schema genuinely
    // changing so an unrelated meta edit (purpose, tag suggestions) does no index work.
    const schemaChanged = JSON.stringify(prev?.typeSchemas ?? null) !== JSON.stringify(updates.meta.typeSchemas ?? null);
    if (schemaChanged) {
      buildSpaceVectorIndexes(spaceId, false).catch(err =>
        log.warn(`P6: vector filter-field rebuild after schema change on '${spaceId}': ${err}`));
    }
  }

  saveConfig(cfg);
  // Fire-and-forget schema file sync
  syncSchemaFiles(spaceId, space.meta).catch(err => log.warn(`syncSchemaFiles: ${err}`));
  return space;
}

/** Reorder spaces in config to match the provided ordered list of IDs.
 *  IDs not present in the list are appended at the end (preserving relative order).
 *  Returns the reordered list of SpaceConfigs, or null if any provided ID is unknown. */
export function reorderSpaces(orderedIds: string[]): SpaceConfig[] | null {
  const cfg = getConfig();
  const idSet = new Set(orderedIds);
  // Validate all provided IDs exist
  for (const id of orderedIds) {
    if (!cfg.spaces.some(s => s.id === id)) return null;
  }
  // Build new order: provided IDs first (in given order), then any remaining spaces
  const reordered: SpaceConfig[] = [];
  for (const id of orderedIds) {
    reordered.push(cfg.spaces.find(s => s.id === id)!);
  }
  for (const space of cfg.spaces) {
    if (!idSet.has(space.id)) reordered.push(space);
  }
  cfg.spaces = reordered;
  saveConfig(cfg);
  return reordered;
}
