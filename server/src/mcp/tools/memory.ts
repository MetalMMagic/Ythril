import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { UUID_V4_RE, entityDocToRecord, formatRecallSummary, toRecallRecord, type McpRecallTraverseItem } from './shared.js';
import { createChrono } from '../../brain/chrono.js';
import { validateDeleteFields } from '../../brain/delete-fields.js';
import { MAX_RECALL_TRAVERSE, traverseRecallSeeds, upsertEdge } from '../../brain/edges.js';
import { findEntitiesByName, upsertEntity } from '../../brain/entities.js';
import { type FilterExpression, type RecallKnowledgeType, type RecallResult, deleteMemory, findSimilar, queryBrain, recall, recallGlobal, remember, updateMemory, validateFilterExpression } from '../../brain/memory.js';
import { getConfig } from '../../config/loader.js';
import { col, asFilter } from '../../db/mongo.js';
import { QuotaError, checkQuota } from '../../quota/quota.js';
import { isStrictLinkage, resolveMemberSpaces, resolveWriteTarget } from '../../spaces/proxy.js';
import { getAllowedChronoTypes, resolveMetaRefs, validateChrono, validateEdge, validateEntity, validateMemory } from '../../spaces/schema-validation.js';

export const rememberTool: ToolHandler = {
  name: 'remember',
  description: 'Store a fact or memory in the knowledge graph with semantic embedding.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            fact: { type: 'string', description: 'The fact, observation, or memory to store.' },
            entities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Entity names mentioned in this memory.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Categorisation tags.',
            },
            description: { type: 'string', description: 'Optional prose context or rationale for this memory.' },
            type: { type: 'string', description: 'Optional memory type (e.g. "note", "decision"). Selects the per-type schema used to validate `properties` — see the space\'s typeSchemas.memory.' },
            properties: {
              type: 'object',
              description: 'Optional structured key-value metadata (filterable via query).',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            checkDuplicates: { type: 'boolean', description: 'Run a semantic near-duplicate check before storing (default true). When a highly similar memory already exists, the response flags it (id + summary + score) so you can update it instead of creating a redundant one. The memory is still stored regardless. Set false to skip the check.' },
            dupeThreshold: { type: 'number', description: 'Cosine-similarity threshold for the duplicate check (0-1, default ~0.92). Lower to flag looser matches.' },
          },
          required: ['space', 'fact'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const fact = String(a['fact'] ?? '');
    if (!fact.trim()) throw new Error('fact must not be empty');
    if (fact.length > 50_000) throw new Error('fact must not exceed 50 000 characters');
    const tags = Array.isArray(a['tags']) ? (a['tags'] as string[]) : [];
    const entityNames = Array.isArray(a['entities']) ? (a['entities'] as string[]) : [];
    const description = typeof a['description'] === 'string' ? a['description'] : undefined;
    const props = (a['properties'] != null && typeof a['properties'] === 'object' && !Array.isArray(a['properties']))
      ? (a['properties'] as Record<string, string | number | boolean>)
      : undefined;
    // `type` selects the per-type schema. Without it, validateMemory() looks up
    // `typeSchemas.memory[undefined]`, finds nothing, and returns NO violations — so the
    // strict-mode gate below could never fire and schema validation was a total no-op on
    // MCP, the surface agents actually use. REST has always accepted `type`.
    const memType = typeof a['type'] === 'string' && a['type'].trim() ? a['type'] : undefined;

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    const ts = wt.target;

    // Schema validation (single pass — reuse for both strict gate and warn output)
    const remMetaRaw = getConfig().spaces.find(s => s.id === ts)?.meta;
    const remMeta = remMetaRaw ? resolveMetaRefs(remMetaRaw) : undefined;
    const remSchemaViolations = remMeta ? validateMemory(remMeta, { type: memType, properties: props }) : [];
    if (remSchemaViolations.length > 0 && remMeta?.validationMode === 'strict') {
      return { content: [{ type: 'text' as const, text: `Error: schema_violation\n${JSON.stringify(remSchemaViolations, null, 2)}` }], isError: true };
    }

    // Quota check — throws QuotaError (caught below) on hard limit
    const remQuota = await checkQuota('brain');

    // Resolve entity names to existing entity IDs (Defect 3 fix).
    // Never auto-create ghost stubs — warn on unresolved names instead.
    const entityIds: string[] = [];
    const unresolvedNames: string[] = [];
    const multiMatchWarnings: string[] = [];
    for (const eName of entityNames) {
      const matches = await findEntitiesByName(ts, eName);
      if (matches.length === 0) {
        unresolvedNames.push(eName);
      } else {
        if (matches.length > 1) {
          multiMatchWarnings.push(`'${eName}' matched ${matches.length} entities — linked to all`);
        }
        for (const m of matches) entityIds.push(m._id);
      }
    }

    const resolvedNames = entityNames.filter(n => !unresolvedNames.includes(n));
    // Insert-time duplicate check defaults ON for the interactive remember tool.
    const remDupeCheck = a['checkDuplicates'] !== false;
    const remDupeThreshold = typeof a['dupeThreshold'] === 'number' ? a['dupeThreshold'] : undefined;
    const mem = await remember(ts, fact, entityIds, tags, description, props, resolvedNames, memType,
      { checkDuplicates: remDupeCheck, dupeThreshold: remDupeThreshold });
    const warnings: string[] = [];
    if (mem.similar && mem.similar.length > 0) {
      warnings.push(`⚠️ Possible duplicate — ${mem.similar.length} existing memor${mem.similar.length === 1 ? 'y is' : 'ies are'} highly similar: ${mem.similar.map(s => `"${s.summary}" (ID ${s._id}, ${s.score.toFixed(2)})`).join('; ')}. This memory was still stored; pass checkDuplicates:false to skip this check, or update the existing one instead.`);
    }
    if (unresolvedNames.length > 0) {
      warnings.push(`⚠️ Unresolved entity names (not linked — create them first): ${unresolvedNames.map(n => `'${n}'`).join(', ')}`);
    }
    for (const w of multiMatchWarnings) warnings.push(`⚠️ ${w}`);
    // Schema warnings (reuse violations from pre-write check)
    if (remMeta?.validationMode === 'warn') {
      for (const v of remSchemaViolations) warnings.push(`⚠️ Schema: ${v.field} — ${v.reason}`);
    }
    const remText = `Stored memory (seq ${mem.seq}, ID ${mem._id}).`
      + (remQuota.softBreached ? `\n⚠️ Storage warning: ${remQuota.warning}` : '')
      + (warnings.length > 0 ? `\n${warnings.join('\n')}` : '');
    return {
      content: [{ type: 'text' as const, text: remText }],
    };
  },
};

export const update_memoryTool: ToolHandler = {
  name: 'update_memory',
  description: 'Update an existing memory\'s fact, tags, entity links, description, or properties. Re-embeds automatically if any content field changes.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', description: 'Memory ID to update.' },
            fact: { type: 'string', description: 'New fact text (triggers re-embedding).' },
            tags: { type: 'array', items: { type: 'string' }, description: 'New tags (replaces existing).' },
            entityIds: { type: 'array', items: { type: 'string' }, description: 'New entity ID links (replaces existing).' },
            description: { type: 'string', description: 'New prose description or context.' },
            properties: {
              type: 'object',
              description: 'Key-value properties to merge (e.g. {"source": "manual"}). Values must be string, number, or boolean.',
              additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
            deleteFields: { type: 'array', items: { type: 'string' }, description: 'Dot-notation paths to delete from the memory (e.g. ["properties.oldKey", "description"]). System fields (id, name, type, spaceId, createdAt, updatedAt) cannot be deleted. Deletions are permanent.' },
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

    const updates: { fact?: string; tags?: string[]; entityIds?: string[]; description?: string; properties?: Record<string, string | number | boolean> } = {};
    if (typeof a['fact'] === 'string') {
      if (!a['fact'].trim()) throw new Error('fact must not be empty');
      updates.fact = a['fact'] as string;
    }
    if (Array.isArray(a['tags'])) updates.tags = a['tags'] as string[];
    if (Array.isArray(a['entityIds'])) updates.entityIds = a['entityIds'] as string[];
    if (typeof a['description'] === 'string') updates.description = a['description'] as string;
    if (a['properties'] !== null && typeof a['properties'] === 'object' && !Array.isArray(a['properties'])) {
      updates.properties = a['properties'] as Record<string, string | number | boolean>;
    }

    if (Object.keys(updates).length === 0 && !dfPaths) throw new Error('At least one of fact, tags, entityIds, description, properties, or deleteFields must be provided');

    const memberIds = resolveMemberSpaces(wt.target);
    // Search member spaces sequentially — consistent with REST endpoint behaviour.
    let updated = null;
    for (const mid of memberIds) {
      updated = await updateMemory(mid, id, updates, dfPaths);
      if (updated) break;
    }
    if (!updated) throw new Error(`Memory '${id}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Memory updated (ID ${updated._id}, seq ${updated.seq}).` }],
    };
  },
};

export const delete_memoryTool: ToolHandler = {
  name: 'delete_memory',
  description: 'Delete a memory by ID. Creates a tombstone for sync propagation.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            id: { type: 'string', description: 'Memory ID to delete.' },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space', 'id'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const id = String(a['id'] ?? '').trim();
    if (!id) throw new Error('id must not be empty');

    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);

    const memberIds = resolveMemberSpaces(wt.target);
    let deleted = false;
    for (const mid of memberIds) {
      if (await deleteMemory(mid, id)) { deleted = true; break; }
    }
    if (!deleted) throw new Error(`Memory '${id}' not found`);
    return {
      content: [{ type: 'text' as const, text: `Memory deleted (ID ${id}).` }],
    };
  },
};

export const recallTool: ToolHandler = {
  name: 'recall',
  description: 'Semantically search all knowledge types (memories, entities, edges, chrono entries, files). Searches the specified space if provided, otherwise searches across all accessible spaces.',
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.optionalSpace,
            query: { type: 'string', description: 'Natural language search query.' },
            topK: { type: 'number', description: 'Max results (default 10).' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Optional tag filter — only results bearing ALL of these tags are returned (applies to memories, entities, chrono entries, and files).' },
            types: {
              type: 'array',
              items: { type: 'string', enum: ['memory', 'entity', 'edge', 'chrono', 'file'] },
              description: 'Optional knowledge-type filter — restrict results to one or more types. Omit to search all types.',
            },
            minPerType: {
              type: 'object',
              description: 'Optional minimum result count per type. Guarantees at least that many results of each type if available (e.g. {"entity": 2, "edge": 1}). Omit to use pure score ranking.',
              additionalProperties: { type: 'number' },
            },
            minScore: {
              type: 'number',
              description: 'Minimum cosine similarity score (0.0–1.0). Results below this threshold are excluded.',
            },
            traverse: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Optional graph expansion depth (integer 0–5, default 0). When > 0, each semantic match is expanded along knowledge-graph edges up to this many hops, and the connected entities are returned alongside the matches. Each result is annotated with source ("recall" or "traverse"), hops (0 = seed), and path (the connecting edge chain). Use with filter/tags to narrow the seed set — traverse > 2 on dense graphs can be slow. Example: recall "auth token scoping" with traverse: 1 returns the matching records plus everything one edge away.',
            },
            filter: {
              type: 'object',
              description: 'Optional property equality/comparison filter applied after vector search. Keys must use dot-notation and start with "properties.", "tags", "type", "name", "status", or "label". Each value is an operator object with one or more of: eq, ne, in (array), exists (boolean), gt, gte, lt, lte. Example: { "properties.status": { "eq": "accepted" }, "properties.count": { "gt": 10 } }. Records not matching ALL filter conditions are excluded.',
              additionalProperties: {
                type: 'object',
                properties: {
                  eq: { description: 'Exact equality.' },
                  ne: { description: 'Not equal.' },
                  in: { type: 'array', description: 'Value is in array (any-of for tags).' },
                  exists: { type: 'boolean', description: 'Property is present.' },
                  gt: { type: 'number', description: 'Greater than.' },
                  gte: { type: 'number', description: 'Greater than or equal.' },
                  lt: { type: 'number', description: 'Less than.' },
                  lte: { type: 'number', description: 'Less than or equal.' },
                },
              },
            },
          },
          required: ['query'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, accessibleSpaceIds } = ctx;
    const query = String(a['query'] ?? '');
    if (!query.trim()) throw new Error('query must not be empty');
    const topK = typeof a['topK'] === 'number' ? a['topK'] : 10;
    const tags = Array.isArray(a['tags']) ? (a['tags'] as unknown[]).filter((t): t is string => typeof t === 'string') : undefined;
    const types = Array.isArray(a['types']) ? (a['types'] as unknown[]).filter((t): t is RecallKnowledgeType => typeof t === 'string') : undefined;
    const minPerType = (a['minPerType'] != null && typeof a['minPerType'] === 'object' && !Array.isArray(a['minPerType']))
      ? (a['minPerType'] as Partial<Record<RecallKnowledgeType, number>>)
      : undefined;
    const minScore = typeof a['minScore'] === 'number' ? a['minScore'] : undefined;

    // Graph-traversal expansion depth. 0 (default) = classic recall, unchanged.
    let traverse = 0;
    if (a['traverse'] != null) {
      if (typeof a['traverse'] !== 'number' || !Number.isInteger(a['traverse']) || a['traverse'] < 0 || a['traverse'] > MAX_RECALL_TRAVERSE) {
        throw new Error(`traverse must be an integer between 0 and ${MAX_RECALL_TRAVERSE}`);
      }
      traverse = a['traverse'];
    }

    let filter: FilterExpression | undefined;
    if (a['filter'] != null) {
      if (typeof a['filter'] !== 'object' || Array.isArray(a['filter'])) {
        throw new Error('filter must be an object');
      }
      const filterErr = validateFilterExpression(a['filter'] as FilterExpression);
      if (filterErr) throw new Error(filterErr);
      filter = a['filter'] as FilterExpression;
    }

    // Resolve the seed set and the authorized space set (same guard for both).
    let seeds: RecallResult[];
    let traverseSpaces: string[];
    if (callSpace) {
      const memberIds = resolveMemberSpaces(callSpace);
      const all = (await Promise.all(memberIds.map(mid => recall(mid, query, topK, tags, types, minPerType, minScore, filter)))).flat();
      all.sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
      seeds = all.slice(0, topK);
      traverseSpaces = memberIds;
    } else {
      seeds = await recallGlobal(accessibleSpaceIds, query, topK, tags, types, minPerType, minScore, filter);
      traverseSpaces = accessibleSpaceIds;
    }

    if (traverse === 0) {
      const output = {
        results: seeds.map(r => ({
          score: r.score,
          spaceId: r.spaceId,
          type: r.type,
          matchedText: r.matchedText ?? formatRecallSummary(r),
          record: toRecallRecord(r),
        })),
        count: seeds.length,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }] };
    }

    // Graph-augmented recall: expand seeds along edges, cap the combined output.
    const totalCap = topK * (traverse + 1) * 4;
    const neighbours = await traverseRecallSeeds(
      traverseSpaces,
      seeds.map(s => ({ _id: s._id, spaceId: s.spaceId })),
      traverse,
      Math.max(0, totalCap - seeds.length),
    );
    const results: McpRecallTraverseItem[] = [
      ...seeds.map(r => ({ score: r.score, source: 'recall' as const, hops: 0, path: [], spaceId: r.spaceId, type: r.type, matchedText: r.matchedText ?? formatRecallSummary(r), record: toRecallRecord(r) })),
      ...neighbours.map(n => ({ score: null, source: 'traverse' as const, hops: n.hops, path: n.path, spaceId: n.spaceId, type: 'entity', matchedText: `${n.record.name} (${n.record.type})`, record: entityDocToRecord(n.record) })),
    ];
    const output = { results, count: results.length, traverseDepth: traverse };
    return { content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }] };
  },
};

export const find_similarTool: ToolHandler = {
  name: 'find_similar',
  description: 'Find entries with high vector similarity to an existing entry. Use for deduplication, "more like this", and merge detection. Uses the entry\'s stored embedding — no re-embedding.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            entryId: { type: 'string', description: 'UUID of the source entry.' },
            entryType: { type: 'string', enum: ['memory', 'entity', 'edge', 'chrono', 'file'], description: 'Knowledge type of the source entry.' },
            targetTypes: {
              type: 'array',
              items: { type: 'string', enum: ['memory', 'entity', 'edge', 'chrono', 'file'] },
              description: 'Which knowledge types to search in. Omit to search all types.',
            },
            topK: { type: 'number', description: 'Max results (default 10).' },
            minScore: { type: 'number', description: 'Minimum cosine similarity threshold (0.0–1.0). Results below this are excluded.' },
            crossSpace: { type: 'boolean', description: 'If true, search across all spaces the token can access. Default: false.' },
          },
          required: ['space', 'entryId', 'entryType'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, cfg, tokenSpaces } = ctx;
    const entryId = String(a['entryId'] ?? '').trim();
    if (!entryId) throw new Error('entryId must not be empty');
    if (!UUID_V4_RE.test(entryId)) throw new Error('entryId must be a valid UUID v4');
    const entryType = String(a['entryType'] ?? '').trim();
    const validTypes = new Set(['memory', 'entity', 'edge', 'chrono', 'file']);
    if (!validTypes.has(entryType)) throw new Error(`entryType must be one of: ${[...validTypes].join(', ')}`);
    const topK = typeof a['topK'] === 'number' ? Math.min(Math.max(a['topK'], 1), 100) : 10;
    const minScore = typeof a['minScore'] === 'number' ? a['minScore'] : undefined;
    const crossSpace = a['crossSpace'] === true;
    const targetTypes = Array.isArray(a['targetTypes'])
      ? (a['targetTypes'] as unknown[]).filter((t): t is RecallKnowledgeType => typeof t === 'string' && validTypes.has(t))
      : undefined;

    let crossSpaceIds: string[] | undefined;
    if (crossSpace) {
      crossSpaceIds = cfg.spaces
        .filter(s => !tokenSpaces || tokenSpaces.includes(s.id))
        .map(s => s.id);
    }

    const memberIds = resolveMemberSpaces(callSpace);
    const result = await findSimilar(
      memberIds[0] ?? callSpace,
      entryId,
      entryType as RecallKnowledgeType,
      topK,
      targetTypes,
      minScore,
      crossSpaceIds,
    );

    const lines: string[] = [];
    lines.push(`Source: [${result.source.type}] ${formatRecallSummary(result.source)} (ID: ${result.source._id})`);
    if (result.results.length === 0) {
      lines.push('No similar entries found.');
    } else {
      for (let i = 0; i < result.results.length; i++) {
        const r = result.results[i]!;
        const spaceLabel = crossSpace ? ` [${r.spaceId}]` : '';
        lines.push(`[${i + 1}]${spaceLabel} [${r.type}] (score: ${r.score?.toFixed(3) ?? 'n/a'}) ${formatRecallSummary(r)}`);
      }
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  },
};

export const queryTool: ToolHandler = {
  name: 'query',
  description: 'Run a structured read-only query (MongoDB filter) against brain collections.',
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            collection: {
              type: 'string',
              enum: ['memories', 'entities', 'edges', 'chrono', 'files'],
              description: 'Collection to query.',
            },
            filter: { type: 'object', description: 'MongoDB filter document.' },
            projection: {
              type: 'object',
              description: 'Fields to include (1) or exclude (0).',
            },
            limit: { type: 'number', description: 'Max documents (default 20, max 100).' },
            maxTimeMS: { type: 'number', description: 'Query timeout in ms (max 30000).' },
          },
          required: ['space', 'collection', 'filter'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace } = ctx;
    const collName = String(a['collection'] ?? '');
    if (!['memories', 'entities', 'edges', 'chrono', 'files'].includes(collName)) {
      throw new Error(`collection must be one of: memories, entities, edges, chrono, files`);
    }
    const filter =
      a['filter'] != null && typeof a['filter'] === 'object'
        ? (a['filter'] as Record<string, unknown>)
        : {};
    const limit = typeof a['limit'] === 'number' ? a['limit'] : 20;
    const maxTimeMS = typeof a['maxTimeMS'] === 'number' ? a['maxTimeMS'] : 5000;
    const projection =
      a['projection'] != null && typeof a['projection'] === 'object'
        ? (a['projection'] as Record<string, unknown>)
        : undefined;

    const memberIds = resolveMemberSpaces(callSpace);
    const docs = (await Promise.all(memberIds.map(mid =>
      queryBrain(
        mid,
        collName as 'memories' | 'entities' | 'edges' | 'chrono' | 'files',
        filter,
        projection,
        limit,
        maxTimeMS,
      ),
    ))).flat();
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(docs, null, 2),
        },
      ],
    };
  },
};

export const bulk_writeTool: ToolHandler = {
  name: 'bulk_write',
  description: 'Batch upsert memories, entities, edges, and/or chrono entries in a single call. Processing order: memories → entities → edges → chrono, so edges referencing newly created entities within the same batch resolve correctly. Each array is optional and capped at 500 entries. Per-item validation errors are reported in `errors` without aborting the rest of the batch.',
  mutating: true,
  spaceRequired: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.requiredSpace,
            memories: {
              type: 'array',
              description: 'Memory entries to insert. Same fields as the `remember` tool.',
              items: {
                type: 'object',
                properties: {
                  fact:        { type: 'string', description: 'The fact or memory to store.' },
                  tags:        { type: 'array', items: { type: 'string' }, description: 'Categorisation tags.' },
                  entityIds:   { type: 'array', items: { type: 'string' }, description: 'Related entity IDs.' },
                  description: { type: 'string', description: 'Optional prose context.' },
                  type:        { type: 'string', description: 'Optional memory type — selects the per-type schema used to validate `properties`.' },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                },
                required: ['fact'],
              },
            },
            entities: {
              type: 'array',
              description: 'Entity entries to upsert. Same fields as the `upsert_entity` tool.',
              items: {
                type: 'object',
                properties: {
                  id:          { type: 'string', description: 'Optional UUID v4 — if provided, updates the entity with this ID (or inserts with this ID). If omitted, a new entity is always inserted.' },
                  name:        { type: 'string', description: 'Entity name.' },
                  type:        { type: 'string', description: 'Entity type.' },
                  tags:        { type: 'array', items: { type: 'string' } },
                  description: { type: 'string' },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                },
                required: ['name', 'type'],
              },
            },
            edges: {
              type: 'array',
              description: 'Edge entries to upsert. Same fields as the `upsert_edge` tool.',
              items: {
                type: 'object',
                properties: {
                  from:        { type: 'string', description: 'Source entity ID.' },
                  to:          { type: 'string', description: 'Target entity ID.' },
                  label:       { type: 'string', description: 'Relationship label.' },
                  type:        { type: 'string' },
                  weight:      { type: 'number' },
                  description: { type: 'string' },
                  tags:        { type: 'array', items: { type: 'string' } },
                  properties:  { type: 'object', additionalProperties: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] } },
                },
                required: ['from', 'to', 'label'],
              },
            },
            chrono: {
              type: 'array',
              description: 'Chrono entries to insert. Same fields as the `create_chrono` tool.',
              items: {
                type: 'object',
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
                },
                required: ['title', 'type', 'startsAt'],
              },
            },
            targetSpace: { type: 'string', description: 'Required for proxy spaces: the member space to write to.' },
          },
          required: ['space'],
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, name } = ctx;
    const wt = resolveWriteTarget(callSpace, a['targetSpace'] as string | undefined);
    if (!wt.ok) throw new Error(wt.error);
    const ts = wt.target;

    // Schema validation context
    const bwMetaRaw = getConfig().spaces.find(s => s.id === ts)?.meta;
    const bwMeta = bwMetaRaw ? resolveMetaRefs(bwMetaRaw) : undefined;
    const bwValidation = bwMeta?.validationMode ?? 'off';

    const BULK_MAX = 500;
    const rawMemories = Array.isArray(a['memories']) ? (a['memories'] as unknown[]).slice(0, BULK_MAX) : [];
    const rawEntities = Array.isArray(a['entities']) ? (a['entities'] as unknown[]).slice(0, BULK_MAX) : [];
    const rawEdges    = Array.isArray(a['edges'])    ? (a['edges']    as unknown[]).slice(0, BULK_MAX) : [];
    const rawChrono   = Array.isArray(a['chrono'])   ? (a['chrono']   as unknown[]).slice(0, BULK_MAX) : [];

    const inserted = { memories: 0, entities: 0, edges: 0, chrono: 0 };
    const updated  = { memories: 0, entities: 0, edges: 0, chrono: 0 };
    const errors: { type: string; index: number; reason: string }[] = [];

    // memories
    for (let i = 0; i < rawMemories.length; i++) {
      const item = rawMemories[i] as Record<string, unknown>;
      const fact = typeof item['fact'] === 'string' ? item['fact'].trim() : '';
      if (!fact) { errors.push({ type: 'memory', index: i, reason: 'missing required field: fact' }); continue; }
      const tags     = Array.isArray(item['tags'])      ? (item['tags']      as unknown[]).filter((t): t is string => typeof t === 'string') : [];
      const entityIds = Array.isArray(item['entityIds']) ? (item['entityIds'] as unknown[]).filter((t): t is string => typeof t === 'string') : [];
      const description = typeof item['description'] === 'string' ? item['description'] : undefined;
      const props = (item['properties'] != null && typeof item['properties'] === 'object' && !Array.isArray(item['properties']))
        ? (item['properties'] as Record<string, string | number | boolean>) : undefined;
      // Without `type`, validateMemory() cannot find a per-type schema and always returns
      // zero violations — so strict mode was unenforceable on this path. See `remember`.
      const memType = typeof item['type'] === 'string' && item['type'].trim() ? (item['type'] as string) : undefined;
      try {
        // Schema validation per memory
        if (bwValidation !== 'off' && bwMeta) {
          const sv = validateMemory(bwMeta, { type: memType, properties: props });
          if (sv.length > 0) {
            if (bwValidation === 'strict') { errors.push({ type: 'memory', index: i, reason: `schema_violation: ${sv.map(v => v.reason).join('; ')}` }); continue; }
            for (const v of sv) errors.push({ type: 'memory', index: i, reason: `schema_warning: ${v.field} — ${v.reason}` });
          }
        }
        await remember(ts, fact, entityIds, tags, description, props, undefined, memType);
        inserted.memories++;
      } catch (err) {
        errors.push({ type: 'memory', index: i, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    // entities
    for (let i = 0; i < rawEntities.length; i++) {
      const item = rawEntities[i] as Record<string, unknown>;
      const eName = typeof item['name'] === 'string' ? item['name'].trim() : '';
      const eType = typeof item['type'] === 'string' ? item['type'].trim() : '';
      if (!eName) { errors.push({ type: 'entity', index: i, reason: 'missing required field: name' }); continue; }
      if (!eType) { errors.push({ type: 'entity', index: i, reason: 'missing required field: type' }); continue; }
      const rawId = typeof item['id'] === 'string' ? item['id'].trim() : undefined;
      if (rawId !== undefined && !UUID_V4_RE.test(rawId)) {
        errors.push({ type: 'entity', index: i, reason: '`id` must be a valid UUID v4' }); continue;
      }
      const tags = Array.isArray(item['tags']) ? (item['tags'] as unknown[]).filter((t): t is string => typeof t === 'string') : [];
      const description = typeof item['description'] === 'string' ? item['description'] : undefined;
      const props = (item['properties'] != null && typeof item['properties'] === 'object' && !Array.isArray(item['properties']))
        ? (item['properties'] as Record<string, string | number | boolean>) : {};
      try {
        // Schema validation per entity
        if (bwValidation !== 'off' && bwMeta) {
          const sv = validateEntity(bwMeta, { name: eName, type: eType, properties: props });
          if (sv.length > 0) {
            if (bwValidation === 'strict') { errors.push({ type: 'entity', index: i, reason: `schema_violation: ${sv.map(v => v.reason).join('; ')}` }); continue; }
            for (const v of sv) errors.push({ type: 'entity', index: i, reason: `schema_warning: ${v.field} — ${v.reason}` });
          }
        }
        // Check for existing entity by ID (if supplied) to determine inserted vs updated
        const existing = rawId
          ? await col<import('../../config/types.js').EntityDoc>(`${ts}_entities`).findOne(asFilter({ _id: rawId, spaceId: ts }))
          : null;
        const result = await upsertEntity(ts, eName, eType, tags, props, description, rawId);
        if (existing) { updated.entities++; } else { inserted.entities++; }
        if (result.warning) { errors.push({ type: 'entity', index: i, reason: result.warning }); }
      } catch (err) {
        errors.push({ type: 'entity', index: i, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    // edges
    for (let i = 0; i < rawEdges.length; i++) {
      const item = rawEdges[i] as Record<string, unknown>;
      const from  = typeof item['from']  === 'string' ? item['from'].trim()  : '';
      const to    = typeof item['to']    === 'string' ? item['to'].trim()    : '';
      const label = typeof item['label'] === 'string' ? item['label'].trim() : '';
      if (!from)  { errors.push({ type: 'edge', index: i, reason: 'missing required field: from' });  continue; }
      if (isStrictLinkage(ts) && !UUID_V4_RE.test(from)) { errors.push({ type: 'edge', index: i, reason: '`from` must be a valid UUID v4 (entity ID), not a name' }); continue; }
      if (!to)    { errors.push({ type: 'edge', index: i, reason: 'missing required field: to' });    continue; }
      if (isStrictLinkage(ts) && !UUID_V4_RE.test(to)) { errors.push({ type: 'edge', index: i, reason: '`to` must be a valid UUID v4 (entity ID), not a name' }); continue; }
      if (!label) { errors.push({ type: 'edge', index: i, reason: 'missing required field: label' }); continue; }
      const weight      = typeof item['weight'] === 'number' ? item['weight'] : undefined;
      const edgeType    = typeof item['type']   === 'string' ? item['type']   : undefined;
      const description = typeof item['description'] === 'string' ? item['description'] : undefined;
      const tags        = Array.isArray(item['tags']) ? (item['tags'] as unknown[]).filter((t): t is string => typeof t === 'string') : undefined;
      const props       = (item['properties'] != null && typeof item['properties'] === 'object' && !Array.isArray(item['properties']))
        ? (item['properties'] as Record<string, string | number | boolean>) : undefined;
      try {
        // Schema validation per edge — `properties` must be passed, or property schemas
        // (required keys, types, enums) are never checked and strict mode is a no-op here.
        // MCP upsert_edge and REST both pass it; only this bulk path omitted it.
        if (bwValidation !== 'off' && bwMeta) {
          const sv = validateEdge(bwMeta, { label, properties: props });
          if (sv.length > 0) {
            if (bwValidation === 'strict') { errors.push({ type: 'edge', index: i, reason: `schema_violation: ${sv.map(v => v.reason).join('; ')}` }); continue; }
            for (const v of sv) errors.push({ type: 'edge', index: i, reason: `schema_warning: ${v.field} — ${v.reason}` });
          }
        }
        const existing = await col<import('../../config/types.js').EdgeDoc>(`${ts}_edges`).findOne(asFilter({ spaceId: ts, from, to, label }));
        await upsertEdge(ts, from, to, label, weight, edgeType, description, props, tags);
        if (existing) { updated.edges++; } else { inserted.edges++; }
      } catch (err) {
        errors.push({ type: 'edge', index: i, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    // chrono
    const bwAllowedChronoTypes = getAllowedChronoTypes(bwMeta);
    for (let i = 0; i < rawChrono.length; i++) {
      const item = rawChrono[i] as Record<string, unknown>;
      const title    = typeof item['title']    === 'string' ? item['title'].trim() : '';
      const bwType   = typeof item['type']     === 'string' ? item['type']         : '';
      const startsAt = typeof item['startsAt'] === 'string' ? item['startsAt']     : '';
      if (!title)   { errors.push({ type: 'chrono', index: i, reason: 'missing required field: title' });   continue; }
      if (!bwAllowedChronoTypes.has(bwType)) { errors.push({ type: 'chrono', index: i, reason: `\`type\` must be one of: ${[...bwAllowedChronoTypes].join(', ')}` }); continue; }
      if (!startsAt) { errors.push({ type: 'chrono', index: i, reason: 'missing required field: startsAt' }); continue; }
      const endsAt      = typeof item['endsAt']      === 'string' ? item['endsAt']      : undefined;
      const status      = typeof item['status']      === 'string' ? item['status']      : undefined;
      const confidence  = typeof item['confidence']  === 'number' ? item['confidence']  : undefined;
      const description = typeof item['description'] === 'string' ? item['description'] : undefined;
      const tags        = Array.isArray(item['tags'])       ? (item['tags']       as unknown[]).filter((t): t is string => typeof t === 'string') : undefined;
      const entityIds   = Array.isArray(item['entityIds'])  ? (item['entityIds']  as unknown[]).filter((t): t is string => typeof t === 'string') : undefined;
      const memoryIds   = Array.isArray(item['memoryIds'])  ? (item['memoryIds']  as unknown[]).filter((t): t is string => typeof t === 'string') : undefined;
      if (entityIds && isStrictLinkage(ts)) {
        const invalidEIds = entityIds.filter(id => !UUID_V4_RE.test(id));
        if (invalidEIds.length > 0) { errors.push({ type: 'chrono', index: i, reason: '`entityIds` must contain valid UUID v4 values (entity IDs), not names' }); continue; }
      }
      if (memoryIds && isStrictLinkage(ts)) {
        const invalidMIds = memoryIds.filter(id => !UUID_V4_RE.test(id));
        if (invalidMIds.length > 0) { errors.push({ type: 'chrono', index: i, reason: '`memoryIds` must contain valid UUID v4 values (memory IDs), not names' }); continue; }
      }
      const props       = (item['properties'] != null && typeof item['properties'] === 'object' && !Array.isArray(item['properties']))
        ? (item['properties'] as Record<string, string | number | boolean>) : undefined;
      try {
        // Schema validation per chrono
        if (bwValidation !== 'off' && bwMeta) {
          const sv = validateChrono(bwMeta, { type: bwType, properties: props });
          if (sv.length > 0) {
            if (bwValidation === 'strict') { errors.push({ type: 'chrono', index: i, reason: `schema_violation: ${sv.map(v => v.reason).join('; ')}` }); continue; }
            for (const v of sv) errors.push({ type: 'chrono', index: i, reason: `schema_warning: ${v.field} — ${v.reason}` });
          }
        }
        await createChrono(ts, {
          title, type: bwType as import('../../config/types.js').ChronoType, startsAt, endsAt,
          status: status as import('../../config/types.js').ChronoStatus | undefined,
          confidence, description, tags, entityIds, memoryIds, properties: props,
        });
        inserted.chrono++;
      } catch (err) {
        errors.push({ type: 'chrono', index: i, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    const summary = `bulk_write complete — inserted: ${JSON.stringify(inserted)}, updated: ${JSON.stringify(updated)}, errors: ${errors.length}`;
    return {
      content: [{ type: 'text' as const, text: summary + (errors.length > 0 ? '\n' + JSON.stringify(errors, null, 2) : '') }],
      isError: false,
    };
  },
};
