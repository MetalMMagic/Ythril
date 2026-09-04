/**
 * Shared bulk-write batch processor.
 *
 * The REST `POST /api/brain/spaces/:id/bulk` endpoint and the MCP `bulk_write` tool were two
 * ~185-line parallel copies of the same validate-and-dispatch loop, and they had drifted (the
 * MCP copy skipped the 50k-fact cap and did not normalise chrono `status`). This is the one
 * source of truth: each surface coerces its input, calls `bulkWrite`, then shapes its own
 * response and emits the single `bulk.write` summary webhook (with its own actor).
 *
 * Per-item webhooks are intentionally NOT emitted here — the shared writers are called without a
 * WebhookActor, so a 10k-item import doesn't fire 10k events. The caller emits one summary.
 */

import { col, asFilter } from '../db/mongo.js';
import { primitivePropertyError } from './property-values.js';
import { arrayWriteError } from './array-write-refusal.js';
import { usesLinkRecords } from './link-adjacency.js';
import { getConfig } from '../config/loader.js';
import {
  resolveMetaRefs, getAllowedChronoTypes, validateMemory, validateEntity, validateEdge, validateChrono,
} from '../spaces/schema-validation.js';
import { isStrictLinkage } from '../spaces/proxy.js';
import { remember } from './memory.js';
import { upsertEntity } from './entities.js';
import { upsertEdge, findEdgeByTriplet } from './edges.js';
import { resolveEdgeEndsForWrite } from './edge-endpoint-names.js';
import { mergeTagsAndProperties, mergePropertiesOrKeep } from './merge-fields.js';
import { createChrono } from './chrono.js';
import type { EntityDoc, ChronoType, ChronoStatus } from '../config/types.js';

/** Max items processed per collection in a single bulk call. */
export const BULK_MAX_PER_TYPE = 500;

import { UUID_V4_RE, edgeEndpointKind, isWellFormedRef } from './entity-refs.js';
import { storedEdgeKind } from './entity-refs.js';
import { REF_KINDS } from '../config/types-knowledge.js';
import type { RefKind } from '../config/types-knowledge.js';
import { NEVER_RETURNED_PROJECTION } from './read-projection.js';
const CHRONO_STATUSES = new Set<ChronoStatus>(['upcoming', 'active', 'completed', 'overdue', 'cancelled']);
const MAX_FACT_LENGTH = 50_000;

interface Counts { memories: number; entities: number; edges: number; chrono: number }

export interface BulkInput {
  memories?: unknown;
  entities?: unknown;
  edges?: unknown;
  chrono?: unknown;
}

export interface BulkResult {
  inserted: Counts;
  updated: Counts;
  errors: { type: string; index: number; reason: string }[];
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : [];
}
function optStrArray(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : undefined;
}
function optProps(v: unknown): Record<string, string | number | boolean> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, string | number | boolean>) : undefined;
}
/** Sentinel: a per-item `ttlDays` was present but not a valid integer 0..36500 or null. */
const TTL_INVALID = Symbol('ttl-invalid');
/** Per-item TTL (F10): a non-negative integer ≤ 36500 sets an expiry, `null` clears it, absent →
 *  undefined (space default); anything else is TTL_INVALID so the item is reported and skipped. */
function bulkTtlDays(v: unknown): number | null | undefined | typeof TTL_INVALID {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 36500) return v;
  return TTL_INVALID;
}
const TTL_INVALID_MSG = '`ttlDays` must be an integer number of days between 0 and 36500, or null to clear the expiry';
function slice(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v.slice(0, BULK_MAX_PER_TYPE) as Record<string, unknown>[]) : [];
}

/**
 * Process a batch of memories/entities/edges/chrono for one space. Deterministic order
 * (memories → entities → edges → chrono), which matters only for records the batch UPDATES: an entity
 * addressed by an existing id is written before an edge below reads it. Per-item failures are collected,
 * never fatal. Returns counts + errors.
 *
 * **The order does not buy a forward reference, and four surfaces said it did until 2026-09-01.** `upsertEntity`
 * mints the identity on insert — a supplied id addresses an existing record and never becomes a new one's — so
 * an id a caller invents for an entity in this payload is not the id that entity gets, and an edge naming it
 * points at nothing. Combined with shape-not-existence below, that edge is stored dangling and counted as
 * inserted. Callers build a graph in two passes, taking ids from the first response.
 */
export async function bulkWrite(spaceId: string, input: BulkInput): Promise<BulkResult> {
  const metaRaw = getConfig().spaces.find(s => s.id === spaceId)?.meta;
  const meta = metaRaw ? resolveMetaRefs(metaRaw) : undefined;
  const mode = meta?.validationMode ?? 'off';
  const strict = isStrictLinkage(spaceId);
  /*
   * `M-2`: on a converted space the six link arrays are no longer a write surface.
   *
   * Resolved ONCE for the batch rather than per item — the marker is a property of the space, and reading
   * config inside a loop over a thousand items is a thousand lookups of a value that cannot change between
   * them. Each item is still refused individually, so a batch reports which of its items were the problem
   * instead of failing whole.
   */
  const converted = usesLinkRecords(spaceId);

  const inserted: Counts = { memories: 0, entities: 0, edges: 0, chrono: 0 };
  const updated: Counts = { memories: 0, entities: 0, edges: 0, chrono: 0 };
  const errors: { type: string; index: number; reason: string }[] = [];

  const schemaFails = (type: string, index: number, violations: { field: string; reason: string }[]): boolean => {
    if (mode === 'off' || !meta || violations.length === 0) return false;
    if (mode === 'strict') { errors.push({ type, index, reason: `schema_violation: ${violations.map(v => v.reason).join('; ')}` }); return true; }
    for (const v of violations) errors.push({ type, index, reason: `schema_warning: ${v.field} — ${v.reason}` });
    return false;
  };

  // ── memories ───────────────────────────────────────────────────────────────
  const memories = slice(input.memories);
  for (let i = 0; i < memories.length; i++) {
    const item = memories[i]!;
    const fact = typeof item['fact'] === 'string' ? item['fact'].trim() : '';
    if (!fact) { errors.push({ type: 'memory', index: i, reason: 'missing required field: fact' }); continue; }
    if (fact.length > MAX_FACT_LENGTH) { errors.push({ type: 'memory', index: i, reason: '`fact` must not exceed 50 000 characters' }); continue; }
    const type = typeof item['type'] === 'string' && item['type'].trim() ? item['type'] : undefined;
    const properties = optProps(item['properties']);
    const ttlDays = bulkTtlDays(item['ttlDays']);
    if (ttlDays === TTL_INVALID) { errors.push({ type: 'memory', index: i, reason: TTL_INVALID_MSG }); continue; }
    const linkArrErr = arrayWriteError(converted, item);
    if (linkArrErr) { errors.push({ type: 'memory', index: i, reason: linkArrErr }); continue; }
    // Memory items were the one bulk shape with no reference check at all — edges and chrono both
    // had one. Format only, like the rest of bulk: a payload may legitimately reference an entity
    // created earlier in the SAME payload, so an existence check here would reject valid forward
    // references. Staged imports that need dangling refs use the strictLinkage escape hatch.
    const memEntityIds = strArray(item['entityIds']);
    if (strict && memEntityIds.some(id => !UUID_V4_RE.test(id))) {
      errors.push({ type: 'memory', index: i, reason: '`entityIds` must contain valid UUID v4 values (entity IDs), not names' });
      continue;
    }
    try {
      if (schemaFails('memory', i, validateMemory(meta ?? {}, { type, properties }))) continue;
      await remember(spaceId, fact, memEntityIds, strArray(item['tags']),
        typeof item['description'] === 'string' ? item['description'] : undefined, properties, type,
        undefined, undefined, ttlDays);
      inserted.memories++;
    } catch (err) { errors.push({ type: 'memory', index: i, reason: err instanceof Error ? err.message : String(err) }); }
  }

  // ── entities ───────────────────────────────────────────────────────────────
  const entities = slice(input.entities);
  for (let i = 0; i < entities.length; i++) {
    const item = entities[i]!;
    const name = typeof item['name'] === 'string' ? item['name'].trim() : '';
    if (!name) { errors.push({ type: 'entity', index: i, reason: 'missing required field: name' }); continue; }
    const type = typeof item['type'] === 'string' ? item['type'].trim() : '';
    if (!type) { errors.push({ type: 'entity', index: i, reason: 'missing required field: type' }); continue; }
    const rawId = typeof item['id'] === 'string' ? item['id'].trim() : undefined;
    if (rawId !== undefined && !UUID_V4_RE.test(rawId)) { errors.push({ type: 'entity', index: i, reason: '`id` must be a valid UUID v4' }); continue; }
    const properties = optProps(item['properties']) ?? {};
    const ttlDays = bulkTtlDays(item['ttlDays']);
    if (ttlDays === TTL_INVALID) { errors.push({ type: 'entity', index: i, reason: TTL_INVALID_MSG }); continue; }
    try {
      // The MERGED record, not the payload — an id that matches an existing entity makes this an
      // update, and the importer had the merge target in hand two lines later for its own counter.
      const existing = rawId
        ? await col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: rawId, spaceId }),
          { projection: NEVER_RETURNED_PROJECTION })
        : null;
      /*
       * THE THIRD DOOR, and nobody reported it — `optProps` above casts the bag and checks no value.
       *
       * Reported for the create/patch pair only, so this is the sweep going wider than the report. It fails
       * the ITEM rather than the request, which is this endpoint's whole contract: one bad row is reported
       * and skipped, never a reason to abandon the rest of a batch.
       *
       * Entity only, matching the single-record doors — `04-brain-api.md` states that the memory, edge and
       * chrono paths deliberately do not reject non-primitives at the API layer, and changing that would
       * refuse writes that work today.
       */
      const propErr = primitivePropertyError(item['properties']);
      if (propErr) { errors.push({ type: 'entity', index: i, reason: propErr }); continue; }
      const mergedEnt = mergeTagsAndProperties(existing as EntityDoc | null, { tags: strArray(item['tags']), properties });
      if (schemaFails('entity', i, validateEntity(meta ?? {}, { name, type, properties: mergedEnt.properties }))) continue;
      const result = await upsertEntity(spaceId, name, type, strArray(item['tags']), properties,
        typeof item['description'] === 'string' ? item['description'] : undefined, rawId, undefined, undefined, ttlDays);
      if (existing) updated.entities++; else inserted.entities++;
      if (result.warning) errors.push({ type: 'entity', index: i, reason: result.warning });
    } catch (err) { errors.push({ type: 'entity', index: i, reason: err instanceof Error ? err.message : String(err) }); }
  }

  // ── edges ──────────────────────────────────────────────────────────────────
  const edges = slice(input.edges);
  for (let i = 0; i < edges.length; i++) {
    const item = edges[i]!;
    const from = typeof item['from'] === 'string' ? item['from'].trim() : '';
    const to = typeof item['to'] === 'string' ? item['to'].trim() : '';
    const label = typeof item['label'] === 'string' ? item['label'].trim() : '';
    /*
     * The endpoint kinds, and they have to be read HERE rather than left to `upsertEdge`, because the shape
     * check two lines down is this door's own copy: a `file` endpoint is a path, so a bulk import of
     * file-ended edges would be refused item by item against a UUID pattern while the same edges go through
     * one at a time on the other two doors.
     *
     * An unknown kind is an item error rather than a throw — bulk's contract is per-item, so it says which
     * index is wrong and carries on with the rest.
     */
    const rawFromKind = item['fromKind'];
    const rawToKind = item['toKind'];
    const badKind = ([['fromKind', rawFromKind], ['toKind', rawToKind]] as const)
      .find(([, v]) => v !== undefined && (typeof v !== 'string' || !(REF_KINDS as readonly string[]).includes(v)));
    if (badKind) { errors.push({ type: 'edge', index: i, reason: `\`${badKind[0]}\` must be one of: ${REF_KINDS.join(', ')}` }); continue; }
    const fromKind = edgeEndpointKind(rawFromKind as RefKind | undefined);
    const toKind = edgeEndpointKind(rawToKind as RefKind | undefined);
    if (!from) { errors.push({ type: 'edge', index: i, reason: 'missing required field: from' }); continue; }
    if (strict && !isWellFormedRef(fromKind, from)) { errors.push({ type: 'edge', index: i, reason: `\`from\` must be a valid ${fromKind} reference, not a name` }); continue; }
    if (!to) { errors.push({ type: 'edge', index: i, reason: 'missing required field: to' }); continue; }
    if (strict && !isWellFormedRef(toKind, to)) { errors.push({ type: 'edge', index: i, reason: `\`to\` must be a valid ${toKind} reference, not a name` }); continue; }
    if (!label) { errors.push({ type: 'edge', index: i, reason: 'missing required field: label' }); continue; }
    const properties = optProps(item['properties']);
    const ttlDays = bulkTtlDays(item['ttlDays']);
    if (ttlDays === TTL_INVALID) { errors.push({ type: 'edge', index: i, reason: TTL_INVALID_MSG }); continue; }
    try {
      /*
       * `upsertEdge` validates too, since 2026-08-29 — this check is kept for REPORTING, not for enforcement.
       *
       * Bulk's contract is per-item: it must say which index failed and carry on with the rest. Letting the
       * throw from `upsertEdge` do the work would report the same refusal with less structure, and the catch
       * below would flatten it to a message. So this stays as the reporting path while the write function is
       * the guarantee — the distinction matters, because the enforcement is no longer THIS line's job.
       */
      const existing = await findEdgeByTriplet(spaceId, from, to, label, fromKind, toKind);
      /*
       * The endpoint facts, resolved for the REPORT as well as the write.
       *
       * `upsertEdge` resolves and enforces on its own; if this line handed the validator nothing, an endpoint
       * refusal would still happen — as a throw, flattened by the catch below into a message naming the field.
       * The item's reason would stop saying which types are allowed, which on a per-item contract is the whole
       * value of the report. One rule, and this is the copy that would have carried less.
       *
       * An endpoint that does not resolve is left ABSENT rather than reported, which is what keeps bulk's own
       * contract intact: references here are checked for shape and never for existence, so a well-formed id
       * pointing at nothing is stored on purpose. An unresolved end cannot break an endpoint rule.
       */
      const resolvedEnds = await resolveEdgeEndsForWrite(spaceId, from, to, label, { fromKind, toKind });
      if (schemaFails('edge', i, validateEdge(meta ?? {},
        { label, properties: mergePropertiesOrKeep(existing?.properties, properties) ?? {} }, resolvedEnds))) continue;
      await upsertEdge(spaceId, from, to, label,
        typeof item['weight'] === 'number' ? item['weight'] : undefined,
        typeof item['type'] === 'string' ? item['type'] : undefined,
        typeof item['description'] === 'string' ? item['description'] : undefined,
        properties, optStrArray(item['tags']), undefined, ttlDays,
        {
          ...(rawFromKind !== undefined ? { fromKind } : {}),
          ...(rawToKind !== undefined ? { toKind } : {}),
        });
      if (existing) updated.edges++; else inserted.edges++;
    } catch (err) { errors.push({ type: 'edge', index: i, reason: err instanceof Error ? err.message : String(err) }); }
  }

  // ── chrono ─────────────────────────────────────────────────────────────────
  const allowedChronoTypes = getAllowedChronoTypes(meta);
  const chrono = slice(input.chrono);
  for (let i = 0; i < chrono.length; i++) {
    const item = chrono[i]!;
    const title = typeof item['title'] === 'string' ? item['title'].trim() : '';
    const type = typeof item['type'] === 'string' ? item['type'] : '';
    const startsAt = typeof item['startsAt'] === 'string' ? item['startsAt'] : '';
    if (!title) { errors.push({ type: 'chrono', index: i, reason: 'missing required field: title' }); continue; }
    if (!allowedChronoTypes.has(type)) { errors.push({ type: 'chrono', index: i, reason: `\`type\` must be one of: ${[...allowedChronoTypes].join(', ')}` }); continue; }
    if (!startsAt) { errors.push({ type: 'chrono', index: i, reason: 'missing required field: startsAt' }); continue; }
    const chronoLinkArrErr = arrayWriteError(converted, item);
    if (chronoLinkArrErr) { errors.push({ type: 'chrono', index: i, reason: chronoLinkArrErr }); continue; }
    const entityIds = optStrArray(item['entityIds']);
    const memoryIds = optStrArray(item['memoryIds']);
    if (strict && entityIds && entityIds.some(id => !UUID_V4_RE.test(id))) { errors.push({ type: 'chrono', index: i, reason: '`entityIds` must contain valid UUID v4 values (entity IDs), not names' }); continue; }
    if (strict && memoryIds && memoryIds.some(id => !UUID_V4_RE.test(id))) { errors.push({ type: 'chrono', index: i, reason: '`memoryIds` must contain valid UUID v4 values (memory IDs), not names' }); continue; }
    const properties = optProps(item['properties']);
    // Normalise status to a known value (drop unknowns) — REST did this; MCP did not.
    const status = typeof item['status'] === 'string' && CHRONO_STATUSES.has(item['status'] as ChronoStatus)
      ? item['status'] as ChronoStatus : undefined;
    const ttlDays = bulkTtlDays(item['ttlDays']);
    if (ttlDays === TTL_INVALID) { errors.push({ type: 'chrono', index: i, reason: TTL_INVALID_MSG }); continue; }
    try {
      if (schemaFails('chrono', i, validateChrono(meta ?? {}, { type, properties }))) continue;
      await createChrono(spaceId, {
        title, type: type as ChronoType, startsAt,
        endsAt: typeof item['endsAt'] === 'string' ? item['endsAt'] : undefined,
        status, confidence: typeof item['confidence'] === 'number' ? item['confidence'] : undefined,
        description: typeof item['description'] === 'string' ? item['description'] : undefined,
        tags: optStrArray(item['tags']), entityIds, memoryIds, properties,
      }, undefined, ttlDays);
      inserted.chrono++;
    } catch (err) { errors.push({ type: 'chrono', index: i, reason: err instanceof Error ? err.message : String(err) }); }
  }

  return { inserted, updated, errors };
}

/** Total records actually written (used to decide whether to fire the bulk.write webhook). */
export function bulkWriteTotal(r: BulkResult): number {
  return r.inserted.memories + r.inserted.entities + r.inserted.edges + r.inserted.chrono
    + r.updated.entities + r.updated.edges;
}
