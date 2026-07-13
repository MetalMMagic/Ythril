import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { getConfig } from '../../config/loader.js';
import { col } from '../../db/mongo.js';
import { resolveMemberSpaces } from '../../spaces/proxy.js';
import { WIPE_COLLECTION_TYPES, type WipeCollectionType, updateSpace, wipeSpace } from '../../spaces/spaces.js';

export const list_spacesTool: ToolHandler = {
  name: 'list_spaces',
  description: 'List all accessible spaces with their IDs, labels, descriptions, and entry counts (memories, entities, edges, chrono). Use counts to decide which spaces are populated and worth querying.',
  inputSchema: (s: ToolSchemas) => ({ type: 'object', properties: {}, required: [] }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { accessibleSpaces } = ctx;
    const spaceCountResults = await Promise.allSettled(
      accessibleSpaces.map(async s => {
        const memberIds = resolveMemberSpaces(s.id);
        const perMember = await Promise.all(memberIds.map(async mid => ({
          memories: await col(`${mid}_memories`).countDocuments(),
          entities: await col(`${mid}_entities`).countDocuments(),
          edges:    await col(`${mid}_edges`).countDocuments(),
          chrono:   await col(`${mid}_chrono`).countDocuments(),
        })));
        return {
          id: s.id,
          counts: {
            memories: perMember.reduce((n, c) => n + c.memories, 0),
            entities: perMember.reduce((n, c) => n + c.entities, 0),
            edges:    perMember.reduce((n, c) => n + c.edges, 0),
            chrono:   perMember.reduce((n, c) => n + c.chrono, 0),
          },
        };
      }),
    );
    const countsBySpaceId: Record<string, { memories: number; entities: number; edges: number; chrono: number }> = {};
    for (const r of spaceCountResults) {
      if (r.status === 'fulfilled') countsBySpaceId[r.value.id] = r.value.counts;
    }
    const result = accessibleSpaces.map(s => ({
      id: s.id,
      label: s.label ?? null,
      description: s.description ?? null,
      counts: countsBySpaceId[s.id] ?? { memories: 0, entities: 0, edges: 0, chrono: 0 },
    }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  },
};

export const get_statsTool: ToolHandler = {
  name: 'get_stats',
  description: 'Return counts of memories, entities, edges, and chrono entries for the current space.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
          },
          required: ['space'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { callSpace } = ctx;
    const memberIds = resolveMemberSpaces(callSpace);
    const counts = await Promise.all(memberIds.map(async mid => ({
      memories: await col(`${mid}_memories`).countDocuments(),
      entities: await col(`${mid}_entities`).countDocuments(),
      edges: await col(`${mid}_edges`).countDocuments(),
      chrono: await col(`${mid}_chrono`).countDocuments(),
      files: await col(`${mid}_files`).countDocuments(),
    })));
    const memories = counts.reduce((s, c) => s + c.memories, 0);
    const entities = counts.reduce((s, c) => s + c.entities, 0);
    const edges = counts.reduce((s, c) => s + c.edges, 0);
    const chrono = counts.reduce((s, c) => s + c.chrono, 0);
    const files = counts.reduce((s, c) => s + c.files, 0);
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ spaceId: callSpace, memories, entities, edges, chrono, files }, null, 2),
      }],
    };
  },
};

export const get_space_metaTool: ToolHandler = {
  name: 'get_space_meta',
  description:
        'Returns the schema, purpose, usage notes, validation mode, and entry counts for this space. ' +
        'Call this before writing to an unfamiliar space to learn what entity types, edge labels, ' +
        'required properties, and naming patterns are expected.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
          },
          required: ['space'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { callSpace } = ctx;
    const metaCfg = getConfig();
    const metaSpace = metaCfg.spaces.find(s => s.id === callSpace);
    const metaBlock = metaSpace?.meta ?? {};
    const metaMemberIds = resolveMemberSpaces(callSpace);
    const metaCounts = await Promise.all(metaMemberIds.map(async mid => ({
      memories: await col(`${mid}_memories`).countDocuments(),
      entities: await col(`${mid}_entities`).countDocuments(),
      edges: await col(`${mid}_edges`).countDocuments(),
      chrono: await col(`${mid}_chrono`).countDocuments(),
      files: await col(`${mid}_files`).countDocuments(),
    })));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { previousVersions: _pv, ...metaPublic } = metaBlock;
    const metaResult = {
      spaceId: callSpace,
      spaceName: metaSpace?.label ?? callSpace,
      ...metaPublic,
      stats: {
        memories: metaCounts.reduce((s, c) => s + c.memories, 0),
        entities: metaCounts.reduce((s, c) => s + c.entities, 0),
        edges: metaCounts.reduce((s, c) => s + c.edges, 0),
        chrono: metaCounts.reduce((s, c) => s + c.chrono, 0),
        files: metaCounts.reduce((s, c) => s + c.files, 0),
      },
    };
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(metaResult, null, 2),
      }],
    };
  },
};

export const update_spaceTool: ToolHandler = {
  name: 'update_space',
  description: 'Update the label or description of the specified space. Requires an admin token.',
  mutating: true,
  admin: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            label: { type: 'string', description: 'New display label for the space (max 200 chars).' },
            description: { type: 'string', description: 'New description for the space (max 2000 chars). Surfaced to MCP clients as space-level instructions.' },
          },
          required: ['space'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, isAdmin } = ctx;
    if (!isAdmin) {
      return {
        content: [{ type: 'text' as const, text: 'Error: update_space requires an admin token' }],
        isError: true,
      };
    }
    const newLabel = typeof a['label'] === 'string' ? a['label'].trim() : undefined;
    const newDesc = typeof a['description'] === 'string' ? a['description'] : undefined;
    if (newLabel === undefined && newDesc === undefined) {
      throw new Error('At least one of label or description must be provided');
    }
    if (newLabel !== undefined && newLabel.length === 0) throw new Error('label must not be empty');
    if (newDesc !== undefined && newDesc.length > 2000) throw new Error('description must not exceed 2000 characters');
    if (newLabel !== undefined && newLabel.length > 200) throw new Error('label must not exceed 200 characters');
    const updates: { label?: string; description?: string } = {};
    if (newLabel !== undefined) updates.label = newLabel;
    if (newDesc !== undefined) updates.description = newDesc;
    const updated = updateSpace(callSpace, updates);
    if (!updated) throw new Error(`Space '${callSpace}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Space '${callSpace}' updated.` }],
    };
  },
};

export const wipe_spaceTool: ToolHandler = {
  name: 'wipe_space',
  description: 'Wipe data from the specified space. By default wipes all collections (memories, entities, edges, chrono, files). Pass `types` to wipe only specific collections. The space itself and its configuration are preserved. Requires an admin token. Idempotent — wiping an empty space returns zero counts.',
  mutating: true,
  admin: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            types: {
              type: 'array',
              items: { type: 'string', enum: ['memories', 'entities', 'edges', 'chrono', 'files'] },
              description: 'Optional subset of collection types to wipe. Omit to wipe all.',
            },
          },
          required: ['space'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, isAdmin } = ctx;
    if (!isAdmin) {
      return {
        content: [{ type: 'text' as const, text: 'Error: wipe_space requires an admin token' }],
        isError: true,
      };
    }
    const rawTypes = Array.isArray(a['types']) ? (a['types'] as unknown[]) : undefined;
    if (rawTypes !== undefined && rawTypes.some(t => typeof t !== 'string' || !WIPE_COLLECTION_TYPES.includes(t as WipeCollectionType))) {
      throw new Error(`types must be an array of: ${WIPE_COLLECTION_TYPES.join(', ')}`);
    }
    const wipeTypes = rawTypes as WipeCollectionType[] | undefined;
    const result = await wipeSpace(callSpace, wipeTypes);
    const typesLabel = wipeTypes && wipeTypes.length > 0 ? wipeTypes.join(', ') : 'all';
    const summary = `Wiped [${typesLabel}] in space '${callSpace}': ${result.memories} memories, ${result.entities} entities, ${result.edges} edges, ${result.chrono} chrono, ${result.files} files.`;
    return {
      content: [{ type: 'text' as const, text: summary }],
    };
  },
};
