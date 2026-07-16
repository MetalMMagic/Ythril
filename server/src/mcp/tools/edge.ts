import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { UUID_V4_RE } from './shared.js';
import { validateDeleteFields } from '../../brain/delete-fields.js';
import { traverseGraph, updateEdgeById, upsertEdge } from '../../brain/edges.js';
import { getConfig } from '../../config/loader.js';
import { isStrictLinkage, resolveMemberSpaces, resolveWriteTarget, findFirstAcrossMembers } from '../../spaces/proxy.js';
import { resolveMetaRefs, validateEdge } from '../../spaces/schema-validation.js';

export const upsert_edgeTool: ToolHandler = {
  name: 'upsert_edge',
  description: 'Create or update a directed relationship edge between two entities.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            from: { type: 'string', description: 'Source entity ID.' },
            to: { type: 'string', description: 'Target entity ID.' },
            label: { type: 'string', description: 'Relationship label (e.g. "works_at", "knows").' },
            type: { type: 'string', description: 'Optional edge type (e.g. "causal", "attribution").' },
            weight: { type: 'number', description: 'Optional edge weight (0–1).' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Categorisation tags.' },
            description: { type: 'string', description: 'Optional prose description of why this relationship exists.' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata for this edge.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'from', 'to', 'label'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name } = ctx;
    const from = String(a['from'] ?? '');
    const to = String(a['to'] ?? '');
    const label = String(a['label'] ?? '');
    if (!from) throw new Error('from must not be empty');
    if (!to) throw new Error('to must not be empty');
    if (!label) throw new Error('label must not be empty');
    const weight = typeof a['weight'] === 'number' ? a['weight'] : undefined;
    const edgeType = typeof a['type'] === 'string' ? a['type'] : undefined;
    const description = typeof a['description'] === 'string' ? a['description'] : undefined;
    const edgeTags = Array.isArray(a['tags']) ? (a['tags'] as string[]) : undefined;
    const edgeProps = (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties']))
      ? (a['properties'] as Record<string, string | number | boolean>)
      : undefined;
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    if (isStrictLinkage(wt.target)) {
      if (!UUID_V4_RE.test(from)) throw new Error('from must be a valid UUID v4 (entity ID), not a name');
      if (!UUID_V4_RE.test(to)) throw new Error('to must be a valid UUID v4 (entity ID), not a name');
    }

    // Schema validation (single pass)
    const edgeMetaRaw = getConfig().spaces.find(s => s.id === wt.target)?.meta;
    const edgeMeta = edgeMetaRaw ? resolveMetaRefs(edgeMetaRaw) : undefined;
    const edgeSchemaViolations = edgeMeta ? validateEdge(edgeMeta, { label: label.trim(), properties: edgeProps }) : [];
    if (edgeSchemaViolations.length > 0 && edgeMeta?.validationMode === 'strict') {
      return { content: [{ type: 'text' as const, text: `Error: schema_violation\n${JSON.stringify(edgeSchemaViolations, null, 2)}` }], isError: true };
    }

    const edge = await upsertEdge(wt.target, from, to, label, weight, edgeType, description, edgeProps, edgeTags, ctx.actor);
    let edgeMsg = `Edge '${label}' (${from} → ${to}) upserted (ID ${edge._id}).`;
    if (edgeMeta?.validationMode === 'warn') {
      for (const v of edgeSchemaViolations) edgeMsg += `\n⚠️ Schema: ${v.field} — ${v.reason}`;
    }
    return {
      content: [{ type: 'text' as const, text: edgeMsg }],
    };
  },
};

export const update_edgeTool: ToolHandler = {
  name: 'update_edge',
  description: 'Update an existing edge by its ID. All fields are optional — only supplied fields are changed.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', description: 'Edge ID to update.' },
            label: { type: 'string', description: 'New relationship label.' },
            type: { type: 'string', description: 'New edge type.' },
            weight: { type: 'number', description: 'New edge weight (0–1).' },
            description: { type: 'string', description: 'New prose description.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to merge with existing tags.' },
            properties: {
              type: 'object',
              description: 'Key-value properties to merge with existing. Values must be string, number, or boolean.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            deleteFields: { type: 'array', items: { type: 'string' }, description: 'Dot-notation paths to delete from the edge (e.g. ["properties.oldKey", "description"]). System fields (id, name, type, spaceId, createdAt, updatedAt) cannot be deleted. Deletions are permanent.' },
          },
          required: ['space', 'id'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const id = String(a['id'] ?? '').trim();
    if (!id) throw new Error('id must not be empty');
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    // Validate deleteFields
    const dfResult = validateDeleteFields(a['deleteFields']);
    if (!dfResult.ok) throw new Error(dfResult.error);
    const dfPaths: string[] | undefined = Array.isArray(a['deleteFields']) && (a['deleteFields'] as string[]).length > 0 ? a['deleteFields'] as string[] : undefined;
    const updates: { label?: string; description?: string; tags?: string[]; properties?: Record<string, string | number | boolean>; weight?: number; type?: string } = {};
    if (typeof a['label'] === 'string') updates.label = (a['label'] as string).trim();
    if (typeof a['description'] === 'string') updates.description = a['description'] as string;
    if (Array.isArray(a['tags'])) updates.tags = a['tags'] as string[];
    if (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      updates.properties = a['properties'] as Record<string, string | number | boolean>;
    }
    if (typeof a['weight'] === 'number') updates.weight = a['weight'] as number;
    if (typeof a['type'] === 'string') updates.type = (a['type'] as string).trim();
    if (Object.keys(updates).length === 0 && !dfPaths) throw new Error('At least one of label, description, tags, properties, weight, type, or deleteFields must be provided');
    const updatedEdge = await findFirstAcrossMembers(wt.target, mid => updateEdgeById(mid, id, updates, dfPaths, ctx.actor));
    if (!updatedEdge) throw new Error(`Edge '${id}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Edge '${updatedEdge.label}' updated (ID ${updatedEdge._id}, seq ${updatedEdge.seq}).` }],
    };
  },
};

export const traverseTool: ToolHandler = {
  name: 'traverse',
  description: 'Follow edges from a starting entity and return reachable nodes up to maxDepth hops. Useful for dependency analysis, impact assessment, and lineage queries.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            startId: { type: 'string', description: 'UUID of the starting entity.' },
            direction: {
              type: 'string',
              enum: ['outbound', 'inbound', 'both'],
              description: 'Follow edges from the node (outbound), to the node (inbound), or both directions. Default: outbound.',
            },
            edgeLabels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter traversal to specific edge labels only. Omit to traverse all labels.',
            },
            maxDepth: { type: 'number', description: 'Maximum hops from startId (default 3, max 10).' },
            limit: { type: 'number', description: 'Maximum total nodes returned (default 100).' },
          },
          required: ['space', 'startId'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const startId = String(a['startId'] ?? '').trim();
    if (!startId) throw new Error('startId must not be empty');
    const directionRaw = typeof a['direction'] === 'string' ? a['direction'] : 'outbound';
    const validDirections = new Set(['outbound', 'inbound', 'both']);
    const direction: 'outbound' | 'inbound' | 'both' = validDirections.has(directionRaw)
      ? (directionRaw as 'outbound' | 'inbound' | 'both')
      : 'outbound';
    const edgeLabels = Array.isArray(a['edgeLabels'])
      ? (a['edgeLabels'] as unknown[]).filter((l): l is string => typeof l === 'string')
      : undefined;
    const maxDepth = typeof a['maxDepth'] === 'number' ? Math.min(Math.max(1, a['maxDepth']), 10) : 3;
    const limit = typeof a['limit'] === 'number' ? Math.min(Math.max(1, a['limit']), 1000) : 100;

    const memberIds = resolveMemberSpaces(callSpace);
    const result = await traverseGraph(memberIds, startId, direction, edgeLabels, maxDepth, limit);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  },
};
