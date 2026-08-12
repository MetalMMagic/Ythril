/**
 * MCP `bulk_write` tool — batch upsert across knowledge types in one call.
 *
 * A cross-type writer (memories + entities + edges + chrono), so it lives in its own file rather
 * than with memory CRUD. The actual batch logic is the shared `bulkWrite()` in `brain/bulk.ts`
 * (one source of truth with the REST `POST /bulk` route); this tool only coerces input, fires the
 * single `bulk.write` summary webhook, and shapes the response.
 */

import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { TTL_DAYS_SCHEMA, uuidSchema } from './shared.js';
import { bulkWrite, bulkWriteTotal } from '../../brain/bulk.js';
import { resolveWriteTarget } from '../../spaces/proxy.js';
import { emitWebhookEvent } from '../../webhooks/dispatcher.js';

export const bulk_writeTool: ToolHandler = {
  name: 'bulk_write',
  description: 'Batch upsert memories, entities, edges, and/or chrono entries in a single call. Processing order: memories → entities → edges → chrono, so edges referencing newly created entities within the same batch resolve correctly. Each array is optional and capped at 500 entries. Per-item validation errors are reported in `errors` without aborting the rest of the batch.',
  mutating: true,
  spaceRequired: true,
  // Partial-success contract: invalid items are reported per-item in `errors`, not rejected up front.
  // The rich item schemas below are for tools/list discovery; per-item validation is done in the handler.
  skipSchemaValidation: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            memories: {
              type: 'array',
              maxItems: 500,
              description: 'Memory entries to insert (max 500; excess entries are dropped). Same fields as the `remember` tool.',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  fact:        { type: 'string', minLength: 1, maxLength: 50000, description: 'The fact or memory to store (1–50 000 characters).' },
                  tags:        { type: 'array', items: { type: 'string' }, description: 'Categorisation tags.' },
                  entityIds:   { type: 'array', items: { type: 'string' }, description: 'Related entity IDs.' },
                  description: { type: 'string', description: 'Optional prose context.' },
                  type:        { type: 'string', description: 'Optional memory type — selects the per-type schema used to validate `properties`.' },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                  ttlDays:     TTL_DAYS_SCHEMA,
                },
                required: ['fact'],
              },
            },
            entities: {
              type: 'array',
              maxItems: 500,
              description: 'Entity entries to upsert (max 500; excess entries are dropped). Same fields as the `upsert_entity` tool.',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id:          uuidSchema('Optional UUID v4 — if provided, updates the entity with this ID (or inserts with this ID). If omitted, a new entity is always inserted.'),
                  name:        { type: 'string', description: 'Entity name.' },
                  type:        { type: 'string', description: 'Entity type.' },
                  tags:        { type: 'array', items: { type: 'string' } },
                  description: { type: 'string' },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                  ttlDays:     TTL_DAYS_SCHEMA,
                },
                required: ['name', 'type'],
              },
            },
            edges: {
              type: 'array',
              maxItems: 500,
              description: 'Edge entries to upsert (max 500; excess entries are dropped). Same fields as the `upsert_edge` tool.',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  from:        { type: 'string', description: 'Source entity ID.' },
                  to:          { type: 'string', description: 'Target entity ID.' },
                  label:       { type: 'string', description: 'Relationship label.' },
                  type:        { type: 'string' },
                  weight:      { type: 'number' },
                  description: { type: 'string' },
                  tags:        { type: 'array', items: { type: 'string' } },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                  ttlDays:     TTL_DAYS_SCHEMA,
                },
                required: ['from', 'to', 'label'],
              },
            },
            chrono: {
              type: 'array',
              maxItems: 500,
              description: 'Chrono entries to insert (max 500; excess entries are dropped). Same fields as the `create_chrono` tool.',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title:       { type: 'string' },
                  type:        { type: 'string', description: 'Entry type (e.g. event, deadline, plan, prediction, milestone, or a custom type defined in the space schema).' },
                  startsAt:    { type: 'string', description: 'ISO 8601 start date/time.' },
                  endsAt:      { type: 'string' },
                  status:      { type: 'string', enum: ['upcoming', 'active', 'completed', 'overdue', 'cancelled'] },
                  confidence:  { type: 'number' },
                  description: { type: 'string' },
                  tags:        { type: 'array', items: { type: 'string' } },
                  entityIds:   { type: 'array', items: { type: 'string' } },
                  memoryIds:   { type: 'array', items: { type: 'string' } },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                  ttlDays:     TTL_DAYS_SCHEMA,
                },
                required: ['title', 'type', 'startsAt'],
              },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    const ts = wt.target;

    const result = await bulkWrite(ts, {
      memories: a['memories'], entities: a['entities'], edges: a['edges'], chrono: a['chrono'],
    });
    if (bulkWriteTotal(result) > 0) {
      // Bulk suppresses per-item webhooks; emit ONE summary a workflow can inspect.
      emitWebhookEvent({ event: 'bulk.write', spaceId: ts, entry: { inserted: result.inserted, updated: result.updated, errorCount: result.errors.length }, ...(ctx.actor ?? {}) });
    }
    const summary = `bulk_write complete — inserted: ${JSON.stringify(result.inserted)}, updated: ${JSON.stringify(result.updated)}, errors: ${result.errors.length}`;
    return {
      content: [{ type: 'text' as const, text: summary + (result.errors.length > 0 ? '\n' + JSON.stringify(result.errors) : '') }],
      isError: false,
    };
  },
};
