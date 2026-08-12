import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { getConfig } from '../../config/loader.js';
import { col } from '../../db/mongo.js';
import { resolveMemberSpaces } from '../../spaces/proxy.js';
import { memberSpacesWithin } from '../../spaces/proxy-scoped.js';
import { WIPE_COLLECTION_TYPES, type WipeCollectionType, wipeSpace } from '../../spaces/lifecycle.js';
import { updateSpace, spacePurpose } from '../../spaces/spaces.js';
import { SPACE_PURPOSE_MAX } from '../../spaces/_shared.js';

export const list_spacesTool: ToolHandler = {
  name: 'list_spaces',
  description: 'List all accessible spaces with their IDs, labels, purposes, and entry counts (memories, entities, edges, chrono). Use counts to decide which spaces are populated and worth querying.',
  inputSchema: (_s: ToolSchemas) => ({ type: 'object', properties: {}, required: [], additionalProperties: false }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { accessibleSpaces , accessibleSpaceIds } = ctx;
    const spaceCountResults = await Promise.allSettled(
      accessibleSpaces.map(async s => {
        const memberIds = memberSpacesWithin(s.id, accessibleSpaceIds);
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
    // `purpose` is the field an admin can edit and the one `get_space_meta` returns; `description` is
    // its deprecated alias, kept because it is published API. They cannot disagree — one store.
    const result = accessibleSpaces.map(s => ({
      id: s.id,
      label: s.label ?? null,
      purpose: spacePurpose(s) ?? null,
      description: spacePurpose(s) ?? null,
      counts: countsBySpaceId[s.id] ?? { memories: 0, entities: 0, edges: 0, chrono: 0 },
    }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
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
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { callSpace , accessibleSpaceIds } = ctx;
    const memberIds = memberSpacesWithin(callSpace, accessibleSpaceIds);
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
        text: JSON.stringify({ spaceId: callSpace, memories, entities, edges, chrono, files }),
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
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { callSpace , accessibleSpaceIds } = ctx;
    const metaCfg = getConfig();
    const metaSpace = metaCfg.spaces.find(s => s.id === callSpace);
    // Always resolve library `$ref` types so the agent sees the effective schema (propertySchemas from
    // the linked library entry), not a bare `{ $ref }` — this is a read-for-use surface, like
    // GET /api/spaces/:id/meta?resolve=1.
    const { resolveMetaRefs } = await import('../../spaces/schema-validation.js');
    const metaBlock = resolveMetaRefs(metaSpace?.meta ?? {});
    const metaMemberIds = memberSpacesWithin(callSpace, accessibleSpaceIds);
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
        text: JSON.stringify(metaResult),
      }],
    };
  },
};

export const update_spaceTool: ToolHandler = {
  name: 'update_space',
  description: 'Update the label or purpose of the specified space. Requires an admin token. `purpose` is the space-level directive MCP clients receive at handshake; `description` is its deprecated alias and writes the same field.',
  mutating: true,
  admin: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            label: { type: 'string', minLength: 1, maxLength: 200, description: 'New display label for the space (1–200 chars).' },
            purpose: { type: 'string', maxLength: SPACE_PURPOSE_MAX, description: `New purpose for the space (max ${SPACE_PURPOSE_MAX} chars) — the space-level directive injected into MCP instructions at handshake.` },
            description: { type: 'string', maxLength: SPACE_PURPOSE_MAX, description: 'DEPRECATED alias of `purpose`; writes the same field. Removal in 3.0.' },
          },
          required: ['space'],
          additionalProperties: false,
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
    // One field with two spellings. `purpose` wins if both are sent, since it is the current name.
    const newDesc = typeof a['purpose'] === 'string' ? a['purpose']
      : typeof a['description'] === 'string' ? a['description'] : undefined;
    if (newLabel === undefined && newDesc === undefined) {
      throw new Error('At least one of label or purpose must be provided');
    }
    if (newLabel !== undefined && newLabel.length === 0) throw new Error('label must not be empty');
    if (newDesc !== undefined && newDesc.length > SPACE_PURPOSE_MAX) throw new Error(`purpose must not exceed ${SPACE_PURPOSE_MAX} characters`);
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
          additionalProperties: false,
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

/**
 * List the instance's tokens.
 *
 * ## Why this is a tool
 *
 * breituai-platform, 2026-08-11T1722Z, third of five: *"The rights matrix decides what a token may do; the
 * surface should not also decide whether it can."* Their workaround was a Kubernetes CronJob that curls
 * `GET /api/tokens` and posts the result into a space as a chrono entry so an agent can read it — a scheduler
 * standing in for a tool call. That workaround also means the inventory an agent reads is as stale as the last
 * tick, which is the part that makes it wrong rather than merely inconvenient.
 *
 * ## The hash cannot leak from here, and not because this code is careful
 *
 * `listTokens()` is typed `Omit<TokenRecord, 'hash'>[]` and destructures the hash out, so the omission is the
 * function's contract rather than this call site's discipline. That matters: a tool that stripped the hash
 * itself would be one edit away from forgetting to, and the compiler would not object.
 *
 * Admin-gated exactly as the REST route is. The response is credential METADATA — names, prefixes, expiry,
 * rights — which is what an audit of who-can-reach-what needs and is no wider than the REST answer.
 */
export const list_tokensTool: ToolHandler = {
  name: 'list_tokens',
  description: 'List this instance\'s API tokens with their names, prefixes, expiry and rights matrix. Admin '
    + 'only. Secrets are never included — a token\'s value exists only at the moment it is minted, and the '
    + 'stored hash is not returned by this or any other surface. Use it to audit which tokens can reach which '
    + 'spaces and at what level.',
  admin: true,
  inputSchema: () => ({
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  }),
  async handle(_ctx: ToolContext): Promise<ToolResult> {
    // Same call the REST route makes, and its return type is what guarantees no hash rides along.
    const { listTokens } = await import('../../auth/tokens.js');
    const tokens = listTokens();

    const lines = tokens.map(t => {
      const bits = [
        t.admin ? 'instance-admin' : null,
        t.readOnly ? 'read-only' : null,
        t.expiresAt ? `expires ${t.expiresAt}` : 'no expiry',
        t.rights ? 'rights matrix' : 'legacy scope',
      ].filter(Boolean).join(', ');
      return `- ${t.name} (${t.id}) — ${bits}`;
    });

    const text = tokens.length > 0
      ? `${tokens.length} token(s):\n${lines.join('\n')}`
      : 'No tokens are configured on this instance.';

    // The full records ride here so an audit can branch on the matrix rather than parse the summary above.
    return { content: [{ type: 'text' as const, text }], structuredContent: { tokens } };
  },
};
