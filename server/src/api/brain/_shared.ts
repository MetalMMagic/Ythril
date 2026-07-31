/**
 * Shared helpers for the /api/brain sub-routers.
 *
 * Extracted when the 1734-line api/brain.ts monolith was split by resource (A17.3). These are the
 * pieces every sub-router needs: webhook token attribution, space-meta lookup, the schema
 * validation gate, the memory list filter, and the UUID matcher.
 */
import { tagContains, textContains, propertiesValueContains } from '../../brain/tag-filter.js';
import { textSearchOr, SEARCHABLE_FIELDS } from '../../brain/text-search.js';
import type express from 'express';
import { getConfig } from '../../config/loader.js';
import { resolveMetaRefs, type SchemaViolation } from '../../spaces/schema-validation.js';
import type { SpaceMeta } from '../../config/types.js';

/** Regex that matches a UUID v4 (case-insensitive). */
// Re-exported from the canonical definition so there is exactly one copy in the codebase.
export { UUID_V4_RE } from '../../brain/entity-refs.js';

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

/**
 * Per-record TTL (F10) from a write body: a non-negative integer number of days to set an expiry,
 * `null` to explicitly clear it, or `undefined` (absent) to fall back to the space default.
 * Call `ttlDaysError` first — a present-but-invalid `ttlDays` is rejected there (fail-loud), so a typo
 * never silently degrades to "no expiry".
 */
export function ttlDaysFromBody(body: unknown): number | null | undefined {
  const v = (body as { ttlDays?: unknown })?.ttlDays;
  if (v === null) return null;
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 36500) return v;
  return undefined;
}

/**
 * Validate a write body's `ttlDays`: returns an error message when it is present but not `null` and not
 * an integer in `[0, 36500]`, else `null`. Absent (`undefined`) and `null` (clear) are both valid.
 * Mirrors the zod bound the space-wide `recordTtlDays` setting enforces, so the two TTL surfaces agree.
 */
export function ttlDaysError(body: unknown): string | null {
  const v = (body as { ttlDays?: unknown })?.ttlDays;
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 36500) {
    return '`ttlDays` must be an integer number of days between 0 and 36500, or null to clear the expiry';
  }
  return null;
}

// ── Schema validation helpers ─────────────────────────────────────────────

/**
 * Both now live in `spaces/schema-validation.ts`, beside the validator they belong to, so that
 * `brain/` can reach them without importing `api/`. Re-exported here because every route already
 * imports them from `_shared` and there is no reason for those to change.
 */
export { getSpaceMeta, applyValidation } from '../../spaces/schema-validation.js';

/** Build a MongoDB filter from `tag` and `entity` query params */
export function buildMemoryFilter(query: Record<string, unknown>): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const tag = typeof query['tag'] === 'string' ? query['tag'] : undefined;
  const entity = typeof query['entity'] === 'string' ? query['entity'] : undefined;
  const type = typeof query['type'] === 'string' ? query['type'] : undefined;
  if (tag) filter['tags'] = tagContains(tag);
  if (entity) filter['entityIds'] = entity;
  if (type) filter['type'] = type;
  // Per-COLUMN description filter. Distinct from `search` below, which spans fact+description: a column
  // filter has to narrow its own column, or the header control lies about what it does.
  const description = typeof query['description'] === 'string' ? query['description'] : undefined;
  if (description) filter['description'] = textContains(description);
  // Properties column filters on VALUE (owner's call). Scans — see `propertiesValueContains`.
  const props = typeof query['properties'] === 'string' ? query['properties'] : undefined;
  if (props) Object.assign(filter, propertiesValueContains(props));
  // Freetext substring over fact + description (2b-iii-a).
  const search = typeof query['search'] === 'string' ? query['search'] : undefined;
  const or = textSearchOr(search, SEARCHABLE_FIELDS.memories);
  if (or) Object.assign(filter, or);
  return filter;
}
