/**
 * MCP retrieval tools — cross-type semantic search over the brain.
 *
 * `recall` (vector search across all knowledge types, with optional graph traversal),
 * `find_similar` (nearest-neighbour to an existing record), and `query` (structured MongoDB
 * read) were split out of the memory-tools bundle: they search memories, entities, edges, chrono
 * entries, and files alike, so they belong with the read/search surface rather than memory CRUD.
 */

import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { UUID_V4_RE, entityDocToRecord, formatRecallSummary, toRecallRecord, type McpRecallTraverseItem } from './shared.js';
import { MAX_RECALL_TRAVERSE, traverseRecallSeeds } from '../../brain/edges.js';
import { type FilterExpression, validateFilterExpression } from '../../brain/filter.js';
import { queryBrain } from '../../brain/query.js';
import { type RecallKnowledgeType, type RecallResult, findSimilar, recall, recallGlobal } from '../../brain/recall.js';
import { resolveMemberSpaces, collectAcrossMembers } from '../../spaces/proxy.js';

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

    const docs = await collectAcrossMembers(callSpace, mid =>
      queryBrain(
        mid,
        collName as 'memories' | 'entities' | 'edges' | 'chrono' | 'files',
        filter,
        projection,
        limit,
        maxTimeMS,
      ));
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
