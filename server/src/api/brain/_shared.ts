/**
 * Shared helpers for the /api/brain sub-routers.
 *
 * Extracted when the 1734-line api/brain.ts monolith was split by resource (A17.3). These are the
 * pieces every sub-router needs: webhook token attribution, space-meta lookup, the schema
 * validation gate, the memory list filter, and the UUID matcher.
 */
import { escapeRegex } from '../../util/redos.js';
import type express from 'express';
import { getConfig } from '../../config/loader.js';
import { resolveMetaRefs, type SchemaViolation } from '../../spaces/schema-validation.js';
import type { SpaceMeta } from '../../config/types.js';

/** Regex that matches a UUID v4 (case-insensitive). */
export const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Webhook helper ────────────────────────────────────────────────────────

/** Extract token identification from the request for webhook payloads. */
export function webhookToken(req: express.Request): { tokenId?: string; tokenLabel?: string } {
  const t = req.authToken;
  if (!t) return {};
  return {
    tokenId: 'id' in t ? (t as { id: string }).id : undefined,
    tokenLabel: t.name,
  };
}

// ── Schema validation helpers ─────────────────────────────────────────────

/** Look up the meta block for a space from config, with library refs resolved. Returns undefined if none. */
export function getSpaceMeta(spaceId: string): SpaceMeta | undefined {
  const cfg = getConfig();
  const meta = cfg.spaces.find(s => s.id === spaceId)?.meta;
  if (!meta) return undefined;
  return resolveMetaRefs(meta);
}

/**
 * Apply schema validation to a write operation.
 * Returns { blocked: true, violations } when strict mode rejects the write.
 * Returns { blocked: false, warnings } when warn mode lets the write through.
 * Returns { blocked: false, warnings: [] } when validation is off or no meta.
 */
export function applyValidation(
  meta: SpaceMeta | undefined,
  violations: SchemaViolation[],
): { blocked: boolean; warnings: SchemaViolation[] } {
  if (!meta || !meta.validationMode || meta.validationMode === 'off' || violations.length === 0) {
    return { blocked: false, warnings: [] };
  }
  if (meta.validationMode === 'strict') {
    return { blocked: true, warnings: violations };
  }
  // warn mode
  return { blocked: false, warnings: violations };
}

/** Build a MongoDB filter from `tag` and `entity` query params */
export function buildMemoryFilter(query: Record<string, unknown>): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const tag = typeof query['tag'] === 'string' ? query['tag'] : undefined;
  const entity = typeof query['entity'] === 'string' ? query['entity'] : undefined;
  const type = typeof query['type'] === 'string' ? query['type'] : undefined;
  if (tag) filter['tags'] = { $regex: `^${escapeRegex(tag)}$`, $options: 'i' };
  if (entity) filter['entityIds'] = entity;
  if (type) filter['type'] = type;
  return filter;
}
