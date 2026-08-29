/**
 * Entity merge engine.
 *
 * Computes a MergePlan for two entities (survivor + absorbed), then either
 * returns the plan as a 409-style conflict (when unresolved keys remain)
 * or executes the merge atomically (when all conflicts are resolved).
 *
 * The merge logic is intentionally ID-agnostic — it works on any two entity
 * IDs in the same space.  Candidate discovery is the caller's responsibility.
 */

import { col, getMongo, asFilter, asDoc, asUpdate } from '../db/mongo.js';
import { nextSeq } from '../util/seq.js';
import { embed } from './embedding.js';
import { entityEmbedText } from './embed-text.js';
import { getEntityById } from './entities.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import { mergeTags } from './merge-fields.js';
import { validateEntity, getSpaceMeta } from '../spaces/schema-validation.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import type { EntityDoc, EdgeDoc, MemoryDoc, ChronoEntry, FileMetaDoc, TombstoneDoc, SpaceMeta, PropertySchema } from '../config/types.js';

// ── Public types ───────────────────────────────────────────────────────────

/** A single property conflict between two entities. */
export interface PropertyConflict {
  key: string;
  type: string;
  survivorValue: unknown;
  absorbedValue: unknown;
  suggestedFn?: string;
  resolved: boolean;
  resolution?: string;
  customValue?: unknown;
}

/** A property that only exists on the absorbed entity — auto-added on merge. */
export interface AbsorbedOnlyProperty {
  key: string;
  value: unknown;
}

/** Warning about edges that will become duplicates after relinking. */
export interface DuplicateEdgeWarning {
  /** ID of the first (survivor-side) edge. */
  survivorEdgeId: string;
  /** ID of the duplicate (absorbed-side) edge after relinking. */
  absorbedEdgeId: string;
  from: string;
  to: string;
  label: string;
}

/** The full merge plan returned on 409 when unresolved conflicts exist. */
export interface MergePlan {
  survivorId: string;
  absorbedId: string;
  propertyConflicts: PropertyConflict[];
  absorbedOnlyProperties: AbsorbedOnlyProperty[];
  duplicateEdgeWarnings: DuplicateEdgeWarning[];
}

/** Resolution provided by the caller for a single property. */
export interface PropertyResolution {
  key: string;
  resolution: string;       // "survivor" | "absorbed" | "fn:<name>" | "custom"
  customValue?: unknown;
}

// ── Numeric merge functions ────────────────────────────────────────────────

const NUMERIC_FNS: Record<string, (a: number, b: number) => number> = {
  avg:   (a, b) => (a + b) / 2,
  min:   (a, b) => Math.min(a, b),
  max:   (a, b) => Math.max(a, b),
  sum:   (a, b) => a + b,
};

const BOOLEAN_FNS: Record<string, (a: boolean, b: boolean) => boolean> = {
  and: (a, b) => a && b,
  or:  (a, b) => a || b,
  xor: (a, b) => a !== b,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Determine the type of a property: use schema declaration first, infer from value otherwise. */
function resolvePropertyType(
  key: string,
  value: unknown,
  schemas?: Record<string, PropertySchema>,
): string {
  const schema = schemas?.[key];
  if (schema?.type) return schema.type;
  const t = typeof value;
  if (t === 'number' || t === 'boolean' || t === 'string') return t;
  if (value !== null && typeof value === 'object') return 'object';
  return 'unknown';
}

/** Get the schema-declared mergeFn for a property, if any. */
function getSuggestedFn(key: string, schemas?: Record<string, PropertySchema>): string | undefined {
  return schemas?.[key]?.mergeFn;
}

// ── Plan computation ───────────────────────────────────────────────────────

/**
 * Compute a MergePlan for two entities in the same space.
 *
 * If `resolutions` are provided, they are applied to the plan — conflicts that
 * match a resolution entry are marked `resolved: true`.
 *
 * Returns the plan plus a `fullyResolved` boolean indicating whether all
 * conflicts have been addressed.
 */
export async function computeMergePlan(
  spaceId: string,
  survivorId: string,
  absorbedId: string,
  resolutions: PropertyResolution[] = [],
): Promise<{ plan: MergePlan; fullyResolved: boolean; survivor: EntityDoc; absorbed: EntityDoc } | { error: string; status: number }> {
  const survivor = await getEntityById(spaceId, survivorId);
  if (!survivor) return { error: `Survivor entity '${survivorId}' not found`, status: 404 };

  const absorbed = await getEntityById(spaceId, absorbedId);
  if (!absorbed) return { error: `Absorbed entity '${absorbedId}' not found`, status: 404 };

  const meta = getConfig().spaces.find(s => s.id === spaceId)?.meta;
  const entitySchemas = meta?.typeSchemas?.entity?.[survivor.type ?? '']?.propertySchemas;

  const resolutionMap = new Map(resolutions.map(r => [r.key, r]));

  // ── Property conflicts ────────────────────────────────────────────────
  const propertyConflicts: PropertyConflict[] = [];
  const absorbedOnlyProperties: AbsorbedOnlyProperty[] = [];

  const survivorProps = survivor.properties ?? {};
  const absorbedProps = absorbed.properties ?? {};

  // Check all absorbed property keys
  for (const key of Object.keys(absorbedProps)) {
    if (key in survivorProps) {
      // Both have this key — conflict if values differ
      if (survivorProps[key] !== absorbedProps[key]) {
        const type = resolvePropertyType(key, survivorProps[key], entitySchemas);
        const suggestedFn = getSuggestedFn(key, entitySchemas);
        const res = resolutionMap.get(key);
        const resolved = !!res;

        propertyConflicts.push({
          key,
          type,
          survivorValue: survivorProps[key],
          absorbedValue: absorbedProps[key],
          ...(suggestedFn ? { suggestedFn } : {}),
          resolved,
          ...(resolved ? { resolution: res!.resolution, ...(res!.customValue !== undefined ? { customValue: res!.customValue } : {}) } : {}),
        });
      }
      // Same value → no conflict, survivor value kept
    } else {
      // Only on absorbed — will be auto-added
      absorbedOnlyProperties.push({ key, value: absorbedProps[key] });
    }
  }

  // ── Duplicate edge warnings ───────────────────────────────────────────
  const duplicateEdgeWarnings = await detectDuplicateEdges(spaceId, survivorId, absorbedId);

  const plan: MergePlan = {
    survivorId,
    absorbedId,
    propertyConflicts,
    absorbedOnlyProperties,
    duplicateEdgeWarnings,
  };

  const fullyResolved = propertyConflicts.every(c => c.resolved);

  return { plan, fullyResolved, survivor, absorbed };
}

/** Detect edges that would become duplicates (same from, to, label) after relinking. */
async function detectDuplicateEdges(
  spaceId: string,
  survivorId: string,
  absorbedId: string,
): Promise<DuplicateEdgeWarning[]> {
  const edgeColl = col<EdgeDoc>(`${spaceId}_edges`);

  // All edges currently referencing the absorbed entity
  const absorbedEdges = await edgeColl
    .find(asFilter<EdgeDoc>({ spaceId, $or: [{ from: absorbedId }, { to: absorbedId }] }))
    .toArray() as EdgeDoc[];

  // All edges currently referencing the survivor entity
  const survivorEdges = await edgeColl
    .find(asFilter<EdgeDoc>({ spaceId, $or: [{ from: survivorId }, { to: survivorId }] }))
    .toArray() as EdgeDoc[];

  const warnings: DuplicateEdgeWarning[] = [];

  // Build a set of (from, to, label) triplets from survivor edges
  const survivorTriplets = new Map<string, string>(); // triplet key → edge ID
  for (const e of survivorEdges) {
    survivorTriplets.set(`${e.from}|${e.to}|${e.label}`, e._id);
  }

  // For each absorbed edge, compute what its triplet would be after relinking
  for (const e of absorbedEdges) {
    const newFrom = e.from === absorbedId ? survivorId : e.from;
    const newTo = e.to === absorbedId ? survivorId : e.to;
    const key = `${newFrom}|${newTo}|${e.label}`;
    const survivorEdgeId = survivorTriplets.get(key);
    if (survivorEdgeId) {
      warnings.push({
        survivorEdgeId,
        absorbedEdgeId: e._id,
        from: newFrom,
        to: newTo,
        label: e.label,
      });
    }
  }

  return warnings;
}

// ── Resolution application ─────────────────────────────────────────────────

/**
 * Property keys that must never be written through a computed index, or they
 * would mutate the object prototype instead of adding a data property.
 */
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** True when `key` is safe to assign as a plain data property. */
function isSafeKey(key: string): boolean {
  return !PROTO_KEYS.has(key);
}

/**
 * Apply resolved property values and return the final merged properties.
 *
 * Prototype-polluting keys (`__proto__`, `constructor`, `prototype`) are
 * rejected before assignment. Object spread copies data properties (it does not
 * invoke the `__proto__` setter), so the danger is only the computed
 * `result[key] = value` writes below — which `isSafeKey` guards. Merge property
 * values are only scalars today, so the blast radius was small, but this keeps
 * the pattern out of a path that assigns user/peer-supplied keys.
 */
export function applyResolutions(
  survivorProps: Record<string, string | number | boolean>,
  absorbedProps: Record<string, string | number | boolean>,
  conflicts: PropertyConflict[],
  absorbedOnly: AbsorbedOnlyProperty[],
): Record<string, string | number | boolean> {
  const result = { ...survivorProps };

  // Apply absorbed-only properties
  for (const p of absorbedOnly) {
    if (!isSafeKey(p.key)) {
      log.warn(`merge: skipping prototype-polluting property key '${p.key}'`);
      continue;
    }
    result[p.key] = p.value as string | number | boolean;
  }

  // Apply conflict resolutions
  for (const c of conflicts) {
    if (!isSafeKey(c.key)) {
      log.warn(`merge: skipping prototype-polluting property key '${c.key}'`);
      continue;
    }
    const resolution = c.resolution!;
    if (resolution === 'survivor') {
      // Keep survivor value (already in result)
      continue;
    } else if (resolution === 'absorbed') {
      result[c.key] = c.absorbedValue as string | number | boolean;
    } else if (resolution === 'custom') {
      if (c.customValue !== undefined) {
        result[c.key] = c.customValue as string | number | boolean;
      }
    } else if (resolution.startsWith('fn:')) {
      const fnName = resolution.slice(3);
      if (c.type === 'number' && NUMERIC_FNS[fnName]) {
        result[c.key] = NUMERIC_FNS[fnName](c.survivorValue as number, c.absorbedValue as number);
      } else if (c.type === 'boolean' && BOOLEAN_FNS[fnName]) {
        result[c.key] = BOOLEAN_FNS[fnName](c.survivorValue as boolean, c.absorbedValue as boolean);
      } else {
        // Validation should prevent reaching this branch — log a warning so mismatches are diagnosable.
        log.warn(`merge: fn '${fnName}' not applicable for type '${c.type}' on property '${c.key}' — keeping survivor value`);
      }
    }
  }

  return result;
}

// ── Merge execution ────────────────────────────────────────────────────────

/**
 * Compare two edge documents ignoring `_id`, `seq`, `updatedAt` — returns true
 * when every other field is identical (i.e. one is a true duplicate of the other
 * after relinking).
 */
function edgesIdentical(a: EdgeDoc, b: EdgeDoc): boolean {
  return a.from === b.from
    && a.to === b.to
    && a.label === b.label
    && a.spaceId === b.spaceId
    && a.type === b.type
    && a.weight === b.weight
    && a.description === b.description
    && JSON.stringify(a.properties ?? {}) === JSON.stringify(b.properties ?? {})
    && JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? []);
}

/**
 * Execute the merge inside a MongoDB transaction: relink edges/memories/chronos,
 * auto-delete duplicate edges (when 100% identical except _id), apply resolved
 * properties to survivor, delete absorbed entity + write tombstone.
 *
 * Precondition: all property conflicts must be resolved before calling this.
 */
export async function executeMerge(
  spaceId: string,
  survivor: EntityDoc,
  absorbed: EntityDoc,
  mergedProperties: Record<string, string | number | boolean>,
  actor?: WebhookActor,
): Promise<{ entity: EntityDoc; deletedDuplicateEdgeIds: string[] }> {
  const session = getMongo().startSession();
  const deletedDuplicateEdgeIds: string[] = [];

  try {
    await session.withTransaction(async () => {
      const now = new Date().toISOString();
      const seq = await nextSeq(spaceId);

      const edgeColl = col<EdgeDoc>(`${spaceId}_edges`);

      // ── 1. Relink edges ────────────────────────────────────────────────
      // Unique compound index on (spaceId, from, to, label) means we must
      // detect and delete absorbed edges that would collide BEFORE relinking.
      // Handle self-loops: when absorbed has an edge A→A, both from and to
      // need to become survivor.

      // Collect all absorbed edges (from=absorbed OR to=absorbed).
      const absorbedEdges = await edgeColl
        .find(asFilter<EdgeDoc>({ spaceId, $or: [{ from: absorbed._id }, { to: absorbed._id }] }), { session })
        .toArray() as EdgeDoc[];

      // Build a set of existing survivor edge keys for collision detection.
      const survivorEdges = await edgeColl
        .find(asFilter<EdgeDoc>({ spaceId, $or: [{ from: survivor._id }, { to: survivor._id }] }), { session })
        .toArray() as EdgeDoc[];
      const survivorKeys = new Set(survivorEdges.map(e => `${e.from}|${e.to}|${e.label}`));

      // Phase 1a: delete absorbed edges whose post-relink key collides with
      // an existing survivor edge (would violate the unique index).
      const edgesToRelink: EdgeDoc[] = [];
      for (const edge of absorbedEdges) {
        const newFrom = edge.from === absorbed._id ? survivor._id : edge.from;
        const newTo = edge.to === absorbed._id ? survivor._id : edge.to;
        const postKey = `${newFrom}|${newTo}|${edge.label}`;
        if (survivorKeys.has(postKey)) {
          // This absorbed edge would collide — delete it as a duplicate.
          await edgeColl.deleteOne(asFilter<EdgeDoc>({ _id: edge._id }), { session });
          const tombSeq = await nextSeq(spaceId);
          await col<TombstoneDoc>(`${spaceId}_tombstones`).replaceOne(
            asFilter<TombstoneDoc>({ _id: edge._id }),
            asDoc<TombstoneDoc>({ _id: edge._id, type: 'edge', spaceId, deletedAt: now, instanceId: getConfig().instanceId, seq: tombSeq }),
            { upsert: true, session },
          );
          deletedDuplicateEdgeIds.push(edge._id);
        } else {
          edgesToRelink.push(edge);
          // Register the post-relink key so subsequent absorbed edges
          // in the same batch don't collide with each other.
          survivorKeys.add(postKey);
        }
      }

      // Phase 1b: relink remaining absorbed edges (no collision risk).
      for (const edge of edgesToRelink) {
        const updates: Record<string, string> = { updatedAt: now };
        if (edge.from === absorbed._id) updates['from'] = survivor._id;
        if (edge.to === absorbed._id) updates['to'] = survivor._id;
        const edgeSeq = await nextSeq(spaceId);
        (updates as Record<string, unknown>)['seq'] = edgeSeq;
        await edgeColl.updateOne(
          asFilter<EdgeDoc>({ _id: edge._id }),
          asUpdate<EdgeDoc>({ $set: updates }),
          { session },
        );
      }

      // ── 2. Relink memories ─────────────────────────────────────────────
      const memoryColl = col<MemoryDoc>(`${spaceId}_memories`);
      const affectedMemories = await memoryColl
        .find(asFilter<MemoryDoc>({ spaceId, entityIds: absorbed._id }), { session })
        .toArray() as MemoryDoc[];
      for (const mem of affectedMemories) {
        const newEntityIds = mem.entityIds.map(id => id === absorbed._id ? survivor._id : id);
        const dedupedIds = [...new Set(newEntityIds)];
        const memSeq = await nextSeq(spaceId);
        await memoryColl.updateOne(
          asFilter<MemoryDoc>({ _id: mem._id }),
          asUpdate<MemoryDoc>({ $set: { entityIds: dedupedIds, updatedAt: now, seq: memSeq } }),
          { session },
        );
      }

      // ── 3. Relink chrono entries ───────────────────────────────────────
      const chronoColl = col<ChronoEntry>(`${spaceId}_chrono`);
      const affectedChronos = await chronoColl
        .find(asFilter<ChronoEntry>({ spaceId, entityIds: absorbed._id }), { session })
        .toArray() as ChronoEntry[];
      for (const ch of affectedChronos) {
        const newEntityIds = ch.entityIds.map(id => id === absorbed._id ? survivor._id : id);
        const dedupedIds = [...new Set(newEntityIds)];
        const chSeq = await nextSeq(spaceId);
        await chronoColl.updateOne(
          asFilter<ChronoEntry>({ _id: ch._id }),
          asUpdate<ChronoEntry>({ $set: { entityIds: dedupedIds, updatedAt: now, seq: chSeq } }),
          { session },
        );
      }

      // ── 3b. Relink FILE metadata records ───────────────────────────────
      //
      // A file record is a knowledge-graph document like the others and carries `entityIds` — that is how a
      // file is linked to an entity, and `assertRefsResolve` enforces at write time that every id in it names
      // a real entity.
      //
      // This phase was missing. Edges, memories and chrono were relinked and files were not, so a merge left
      // every file whose `entityIds` held the absorbed id pointing at an entity that phase 5 then DELETED.
      // The merge path broke the invariant the write path enforces.
      //
      // It was invisible from every direction: the ER model counts `linkedFrom.files` as a first-class
      // relationship, so the number was simply wrong; `danglingEdges` in that same model counts dangling
      // EDGES and never looked at files; `strictLinkage` blocks deleting an entity that still has inbound
      // backlinks, and a merge deletes the absorbed entity directly rather than passing that guard. A
      // traversal from the file came back empty, which reads as "nothing linked" rather than as a broken link.
      const fileColl = col<FileMetaDoc>(`${spaceId}_files`);
      const affectedFiles = await fileColl
        .find(asFilter<FileMetaDoc>({ spaceId, entityIds: absorbed._id }), { session })
        .toArray() as FileMetaDoc[];
      for (const f of affectedFiles) {
        // `?? []` because `entityIds` is OPTIONAL on a file record, unlike memories and chrono where it is
        // required. The filter above only matches files that hold the id, so the fallback never fires in
        // practice — but the map has to be total over the type rather than rely on that.
        const newEntityIds = (f.entityIds ?? []).map(id => id === absorbed._id ? survivor._id : id);
        const dedupedIds = [...new Set(newEntityIds)];
        const fSeq = await nextSeq(spaceId);
        await fileColl.updateOne(
          asFilter<FileMetaDoc>({ _id: f._id }),
          asUpdate<FileMetaDoc>({ $set: { entityIds: dedupedIds, updatedAt: now, seq: fSeq } }),
          { session },
        );
      }

      // ── 4. Update survivor entity ──────────────────────────────────────
      const mergedTags = mergeTags(survivor.tags, absorbed.tags);
      const entityColl = col<EntityDoc>(`${spaceId}_entities`);

      let embeddingFields: { embedding?: number[]; embeddingModel?: string } = {};
      try {
        const embResult = await embed(entityEmbedText(
          survivor.name, survivor.type, mergedTags, survivor.description, mergedProperties,
        ));
        embeddingFields = { embedding: embResult.vector, embeddingModel: embResult.model };
      } catch { /* embedding unavailable — keep existing embedding */ }

      /*
       * THE MERGE PATH RUNS THE VALIDATORS THE WRITE PATH RUNS. It did not, and nothing noticed.
       *
       * `mergeProperties` applies each property's `mergeFn`, so the survivor's properties are a value NEITHER
       * input necessarily had — a `sum` can exceed a `maximum`, a `concat` can break a `pattern`, a pick can
       * land outside an `enum`. This file imported nothing from `spaces/schema-validation.ts`, so a background
       * `automerge` that nobody invoked could write a survivor into a `strict` space that the same space would
       * have refused through `upsert_entity`.
       *
       * The precedent is exact, from CHANGELOG: *"An entity merge left every FILE linked to the absorbed entity
       * pointing at a record it had just deleted… The merge path broke the invariant the write path enforces."*
       * Same file, same shape, one invariant over.
       *
       * **It reports and proceeds; it does not refuse.** Refusing is a real option and a real question — an
       * automerge that stops leaves the duplicates it was meant to resolve, which may be worse than a survivor
       * that violates a property rule — and that trade is the owner's, parked as P-19. What is not in question
       * is that the violation must be visible: this codebase has twice concluded that *the fix is visibility,
       * not severity*, for the sync drop and for the media-worker swallow.
       */
      const violations = validateEntity(getSpaceMeta(spaceId) ?? {}, {
        name: survivor.name, type: survivor.type, properties: mergedProperties, tags: mergedTags,
      });
      if (violations.length > 0) {
        log.warn(
          `merge: the survivor '${survivor._id}' in space '${spaceId}' violates its own schema after merging `
          + `'${absorbed._id}' — the merged properties are a value neither input had. The merge PROCEEDED; `
          + `these would have been refused on a direct write: `
          + violations.map(v => `${v.field}: ${v.reason}`).join('; '),
        );
      }

      await entityColl.updateOne(
        asFilter<EntityDoc>({ _id: survivor._id }),
        asUpdate<EntityDoc>({ $set: { properties: mergedProperties, tags: mergedTags, updatedAt: now, seq, ...embeddingFields } }),
        { session },
      );

      // ── 5. Delete absorbed entity + write tombstone ────────────────────
      const absorbedSeq = await nextSeq(spaceId);
      await entityColl.deleteOne(asFilter<EntityDoc>({ _id: absorbed._id, spaceId }), { session });
      await col<TombstoneDoc>(`${spaceId}_tombstones`).replaceOne(
        asFilter<TombstoneDoc>({ _id: absorbed._id }),
        asDoc<TombstoneDoc>({ _id: absorbed._id, type: 'entity', spaceId, deletedAt: now, instanceId: getConfig().instanceId, seq: absorbedSeq }),
        { upsert: true, session },
      );

      // Store result on survivor for return
      Object.assign(survivor, {
        properties: mergedProperties,
        tags: mergedTags,
        updatedAt: now,
        seq,
        ...embeddingFields,
      });
    });
  } finally {
    await session.endSession();
  }

  // Centralised webhook emission: a merge is an update to the survivor, deletion of the
  // absorbed entity, and deletion of any duplicate edges collapsed in the process. All four
  // fire here so every caller (REST, duplicates, dupe-scanner, MCP) is consistent.
  if (actor) {
    emitWebhookEvent({ event: 'entity.merged', spaceId, entry: { survivor: { ...survivor, embedding: undefined }, absorbedId: absorbed._id }, ...actor });
    emitWebhookEvent({ event: 'entity.updated', spaceId, entry: { ...survivor, embedding: undefined }, ...actor });
    emitWebhookEvent({ event: 'entity.deleted', spaceId, entry: { _id: absorbed._id }, ...actor });
    for (const dupId of deletedDuplicateEdgeIds) {
      emitWebhookEvent({ event: 'edge.deleted', spaceId, entry: { _id: dupId }, ...actor });
    }
  }

  return {
    entity: survivor,
    deletedDuplicateEdgeIds,
  };
}

// ── Validation helpers ─────────────────────────────────────────────────────

const VALID_NUMERIC_FNS = new Set(['avg', 'min', 'max', 'sum']);
const VALID_BOOLEAN_FNS = new Set(['and', 'or', 'xor']);

/**
 * Validate a resolution string for a given property type.
 * Returns an error message if invalid, or null if valid.
 */
export function validateResolution(resolution: string, type: string, hasCustomValue: boolean): string | null {
  if (resolution === 'survivor' || resolution === 'absorbed') return null;
  if (resolution === 'custom') {
    if (!hasCustomValue) return 'resolution "custom" requires a customValue';
    return null;
  }
  if (resolution.startsWith('fn:')) {
    const fnName = resolution.slice(3);
    if (type === 'number') {
      if (!VALID_NUMERIC_FNS.has(fnName)) return `unknown numeric merge function: ${fnName}`;
      return null;
    }
    if (type === 'boolean') {
      if (!VALID_BOOLEAN_FNS.has(fnName)) return `unknown boolean merge function: ${fnName}`;
      return null;
    }
    return `fn: resolutions require type "number" or "boolean", got "${type}"`;
  }
  return `unknown resolution: ${resolution}`;
}
