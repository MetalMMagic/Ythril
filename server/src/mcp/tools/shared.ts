import type { RecallResult } from '../../brain/recall.js';

/** Helpers shared by the MCP tool handlers (moved out of mcp/router.ts). */

export const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** JSON-schema fragment for the per-record TTL arg (F10), shared by every MCP write tool. */
export const TTL_DAYS_SCHEMA = {
  type: ['integer', 'null'],
  minimum: 0,
  maximum: 36500,
  description: 'Auto-delete this record after N days. A positive integer sets the expiry; 0 or null means never expire (overriding any space-wide default); omit to inherit the space default.',
} as const;

/**
 * Parse + validate `ttlDays` from MCP tool args (F10): a non-negative integer ≤ 36500 sets an expiry,
 * `null` clears it, and absent → `undefined` (inherit the space default). Throws on a present-but-invalid
 * value so the MCP surface fails loud like REST rather than silently dropping the intent.
 */
export function ttlDaysFromArgs(args: Record<string, unknown>): number | null | undefined {
  const v = args['ttlDays'];
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 36500) {
    throw new Error('ttlDays must be an integer number of days between 0 and 36500, or null to clear the expiry');
  }
  return v;
}

/** Format a RecallResult as a single human-readable summary line. */
export function formatRecallSummary(r: RecallResult): string {
  switch (r.type) {
    case 'memory':
      return r.fact;
    case 'entity':
      return `${r.name} (${r.entityType})`;
    case 'edge':
      return `${r.from} → ${r.label} → ${r.to}`;
    case 'chrono':
      return r.description ? `${r.title}: ${r.description}` : r.title;
    case 'file':
      return r.description ? `${r.path}: ${r.description}` : r.path;
  }
}

export function toRecallRecord(r: RecallResult): Record<string, unknown> {
  const common: Record<string, unknown> = { _id: r._id };
  if (r.createdAt !== undefined) common['createdAt'] = r.createdAt;
  if (r.updatedAt !== undefined) common['updatedAt'] = r.updatedAt;
  if (r.seq !== undefined) common['seq'] = r.seq;
  if (r.embeddingModel !== undefined) common['embeddingModel'] = r.embeddingModel;
  if (r.tags !== undefined) common['tags'] = r.tags;
  if (r.description !== undefined) common['description'] = r.description;
  if (r.properties !== undefined) common['properties'] = r.properties;
  switch (r.type) {
    case 'memory':
      return { ...common, fact: r.fact, ...(r.entityIds !== undefined ? { entityIds: r.entityIds } : {}) };
    case 'entity':
      return { ...common, name: r.name, type: r.entityType };
    case 'edge':
      return { ...common, from: r.from, to: r.to, label: r.label, ...(r.weight !== undefined ? { weight: r.weight } : {}), ...(r.edgeType !== undefined ? { type: r.edgeType } : {}) };
    case 'chrono':
      return { ...common, title: r.title, type: r.chronoType, startsAt: r.startsAt, ...(r.status !== undefined ? { status: r.status } : {}), ...(r.entityIds !== undefined ? { entityIds: r.entityIds } : {}) };
    case 'file':
      return { ...common, path: r.path, ...(r.sizeBytes !== undefined ? { sizeBytes: r.sizeBytes } : {}), ...(r.parentFileId !== undefined ? { parentFileId: r.parentFileId } : {}), ...(r.chunkIndex !== undefined ? { chunkIndex: r.chunkIndex } : {}), ...(r.headingText !== undefined ? { headingText: r.headingText } : {}), ...(r.content !== undefined ? { content: r.content } : {}) };
  }
}

export function entityDocToRecord(e: import('../../config/types.js').EntityDoc): Record<string, unknown> {
  const rec: Record<string, unknown> = { _id: e._id, name: e.name, type: e.type };
  if (e.createdAt !== undefined) rec['createdAt'] = e.createdAt;
  if (e.updatedAt !== undefined) rec['updatedAt'] = e.updatedAt;
  if (e.seq !== undefined) rec['seq'] = e.seq;
  if (e.tags !== undefined) rec['tags'] = e.tags;
  if (e.description !== undefined) rec['description'] = e.description;
  if (e.properties !== undefined) rec['properties'] = e.properties;
  if (e.embeddingModel !== undefined) rec['embeddingModel'] = e.embeddingModel;
  return rec;
}

/** One entry in a graph-augmented recall response (traverse > 0). */
export interface McpRecallTraverseItem {
  score: number | null;
  source: 'recall' | 'traverse';
  hops: number;
  path: { from: string; label: string; to: string }[];
  spaceId: string;
  type: string;
  matchedText: string;
  record: Record<string, unknown>;
}
