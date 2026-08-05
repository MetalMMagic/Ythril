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
import { getConfig } from '../config/loader.js';
import {
  resolveMetaRefs, getAllowedChronoTypes, validateMemory, validateEntity, validateEdge, validateChrono,
} from '../spaces/schema-validation.js';
import { isStrictLinkage } from '../spaces/proxy.js';
import { remember } from './memory.js';
import { upsertEntity } from './entities.js';
import { upsertEdge, findEdgeByTriplet } from './edges.js';
import { mergeTagsAndProperties, mergePropertiesOrKeep } from './merge-fields.js';
import { createChrono } from './chrono.js';
import type { EntityDoc, ChronoType, ChronoStatus } from '../config/types.js';

/** Max items processed per collection in a single bulk call. */
export const BULK_MAX_PER_TYPE = 500;

import { UUID_V4_RE } from './entity-refs.js';
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
 * (memories → entities → edges → chrono) so edges/chrono can reference records created earlier
 * in the same batch. Per-item failures are collected, never fatal. Returns counts + errors.
 */
export async function bulkWrite(spaceId: string, input: BulkInput): Promise<BulkResult> {
  const metaRaw = getConfig().spaces.find(s => s.id === spaceId)?.meta;
  const meta = metaRaw ? resolveMetaRefs(metaRaw) : undefined;
  const mode = meta?.validationMode ?? 'off';
  const strict = isStrictLinkage(spaceId);

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
        typeof item['description'] === 'string' ? item['description'] : undefined, properties, undefined, type,
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
        ? await col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: rawId, spaceId }))
        : null;
      const mergedEnt = mergeTagsAndProperties(existing as EntityDoc | null, { tags: strArray(item['tags']), properties });
      if (schemaFails('entity', i, validateEntity(meta ?? {}, { name, type, properties: mergedEnt.properties, tags: mergedEnt.tags }))) continue;
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
    if (!from) { errors.push({ type: 'edge', index: i, reason: 'missing required field: from' }); continue; }
    if (strict && !UUID_V4_RE.test(from)) { errors.push({ type: 'edge', index: i, reason: '`from` must be a valid UUID v4 (entity ID), not a name' }); continue; }
    if (!to) { errors.push({ type: 'edge', index: i, reason: 'missing required field: to' }); continue; }
    if (strict && !UUID_V4_RE.test(to)) { errors.push({ type: 'edge', index: i, reason: '`to` must be a valid UUID v4 (entity ID), not a name' }); continue; }
    if (!label) { errors.push({ type: 'edge', index: i, reason: 'missing required field: label' }); continue; }
    const properties = optProps(item['properties']);
    const ttlDays = bulkTtlDays(item['ttlDays']);
    if (ttlDays === TTL_INVALID) { errors.push({ type: 'edge', index: i, reason: TTL_INVALID_MSG }); continue; }
    try {
      const existing = await findEdgeByTriplet(spaceId, from, to, label);
      if (schemaFails('edge', i, validateEdge(meta ?? {}, { label, properties: mergePropertiesOrKeep(existing?.properties, properties) ?? {} }))) continue;
      await upsertEdge(spaceId, from, to, label,
        typeof item['weight'] === 'number' ? item['weight'] : undefined,
        typeof item['type'] === 'string' ? item['type'] : undefined,
        typeof item['description'] === 'string' ? item['description'] : undefined,
        properties, optStrArray(item['tags']), undefined, ttlDays);
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
