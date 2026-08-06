/**
 * MCP retrieval tools — cross-type semantic search over the brain.
 *
 * `recall` (vector search across all knowledge types, with optional graph traversal),
 * `find_similar` (nearest-neighbour to an existing record), and `query` (structured MongoDB
 * read) were split out of the memory-tools bundle: they search memories, entities, edges, chrono
 * entries, and files alike, so they belong with the read/search surface rather than memory CRUD.
 */

import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { UUID_V4_RE, entityDocToRecord, formatRecallSummary, toRecallRecord, uuidSchema, unitScoreSchema, QUERY_FILTER_OPERATORS, RECALL_FILTER_KEY_PATTERN, type McpRecallTraverseItem } from './shared.js';
import { MAX_RECALL_TRAVERSE, traverseRecallSeeds } from '../../brain/edges.js';
import { type FilterExpression, validateFilterExpression } from '../../brain/filter.js';
import { queryBrain } from '../../brain/query.js';
import { type RecallKnowledgeType, type RecallResult, findSimilar, recall, recallGlobal, rankOf, mergeRecallResults } from '../../brain/recall.js';
import { resolveMemberSpaces, collectAcrossMembers } from '../../spaces/proxy.js';
import { NotFoundError } from '../../util/errors.js';

/**
 * Space scope for find_similar — mirrors recall's omit-space idiom (F1 consistency).
 *
 * - `space` given (and not the deprecated `crossSpace`): locate the source in that proxy-resolved space
 *   and search only there (searchIds `undefined` → findSimilar searches just the base space).
 * - `space` omitted, or legacy `crossSpace: true`: locate the source across ALL accessible spaces (first
 *   base that holds the entry wins) and search across all of them.
 *
 * Pure (proxy resolver injected) so the scope logic is unit-testable without a database.
 */
export function resolveFindSimilarScope(
  callSpace: string | undefined,
  crossSpace: boolean,
  accessibleSpaceIds: string[],
  resolveMembers: (space: string) => string[],
): { candidateBases: string[]; searchIds: string[] | undefined } {
  if (callSpace && !crossSpace) {
    const members = resolveMembers(callSpace);
    return { candidateBases: [members[0] ?? callSpace], searchIds: undefined };
  }
  return { candidateBases: accessibleSpaceIds, searchIds: accessibleSpaceIds };
}

export const recallTool: ToolHandler = {
  name: 'recall',
  description: 'Search all knowledge types (memories, entities, edges, chrono entries, files) by MEANING and by exact tokens: a semantic vector ranking is fused with a lexical (BM25) ranking, so identifiers such as article numbers or form ids rank even though their embeddings carry little meaning. A cross-encoder refines the top candidates when the operator has configured one. Searches the specified space if provided, otherwise across all accessible spaces. Results carry `score` (vector similarity); `minScore` filters on that score only, never on the fused or rerank ordering. The per-stage scores are deliberately omitted here to keep responses small — the REST endpoint returns them for debugging.',
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.optionalSpace,
            query: { type: 'string', minLength: 1, description: 'Natural language search query (required, non-empty).' },
            topK: { type: 'number', minimum: 1, default: 10, description: 'Max results to return. Default 10; no hard cap, but very large values are slower.' },
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
            maxPerType: {
              type: 'object',
              description: 'Optional MAXIMUM result count per type — the ceiling to minPerType\'s floor (e.g. {"file": 2, "memory": 4}). A slot freed by the cap goes to another type, so this is how you stop one long file chunk from crowding out several one-line records that would answer the query more cheaply. At least 1 per type; use `types` to exclude a type entirely. Must not be below minPerType for the same type — a contradictory pair is refused rather than silently resolved.',
              additionalProperties: { type: 'number', minimum: 1 },
            },
            maxTimeMS: {
              type: 'number',
              minimum: 1,
              description: 'Optional deadline for this recall, in milliseconds. It can only LOWER the instance budget, never raise it, and is clamped to a small floor so a tiny value is not a guaranteed empty answer. On expiry you get a PARTIAL answer rather than an error or a hang: whichever collections finished are returned, and the response says it degraded. Use it when a slow recall would cost more than a thin one — a memory that can only ever delay you by a known amount is one you can put in a workflow.',
            },
            minScore: unitScoreSchema('Minimum cosine similarity score (0.0–1.0). Results below this threshold are excluded.'),
            includeContent: {
              type: 'boolean',
              default: true,
              description: 'Whether to return each file chunk’s `content` — the passage body (default true). Set false to get locations and metadata only: path, heading, chunk index, tags, properties. Use it for a two-phase flow — recall to find WHERE something is, then read only the chunk you decided you need. Every field a result carries is multiplied by topK and paid for in tokens, and passage bodies are by far the largest of them.',
            },
            traverse: {
              type: 'number',
              minimum: 0,
              maximum: 5,
              description: 'Optional graph expansion depth (integer 0–5, default 0). When > 0, each semantic match is expanded along knowledge-graph edges up to this many hops, and the connected entities are returned alongside the matches. Each result is annotated with source ("recall" or "traverse"), hops (0 = seed), and path (the connecting edge chain). Use with filter/tags to narrow the seed set — traverse > 2 on dense graphs can be slow. Example: recall "auth token scoping" with traverse: 1 returns the matching records plus everything one edge away.',
            },
            filter: {
              type: 'object',
              description: 'Optional property equality/comparison filter applied after vector search. Keys must use dot-notation and start with "properties.", "tags", "type", "name", "status", or "label" (any other key is rejected). Each value is an operator object with one or more of: eq, ne, in (array), exists (boolean), gt, gte, lt, lte. Example: { "properties.status": { "eq": "accepted" }, "properties.count": { "gt": 10 } }. Records not matching ALL filter conditions are excluded.',
              propertyNames: { pattern: RECALL_FILTER_KEY_PATTERN },
              additionalProperties: {
                type: 'object',
                additionalProperties: false,
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
          additionalProperties: false,
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
    const includeContent = a['includeContent'] !== false;

    // The ceiling to minPerType's floor. Validated here as well as in the schema, because
    // `additionalProperties: { minimum: 1 }` cannot express "not below minPerType for the same type" — and
    // the REST route enforces both, so leaving MCP with only half is exactly the two-surfaces-one-rule gap
    // that #695, #697 and #700 were.
    let maxPerType: Partial<Record<RecallKnowledgeType, number>> | undefined;
    if (a['maxPerType'] != null) {
      if (typeof a['maxPerType'] !== 'object' || Array.isArray(a['maxPerType'])) {
        throw new Error('maxPerType must be an object mapping knowledge type -> maximum count');
      }
      const acc: Partial<Record<RecallKnowledgeType, number>> = {};
      for (const [key, raw] of Object.entries(a['maxPerType'] as Record<string, unknown>)) {
        if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
          throw new Error(`maxPerType.${key} must be an integer of at least 1 (use \`types\` to exclude a knowledge type entirely)`);
        }
        acc[key as RecallKnowledgeType] = Math.min(raw, topK);
      }
      if (Object.keys(acc).length > 0) maxPerType = acc;
    }
    // Per-call deadline — lowers the instance budget, never raises it. Clamped in `recall` rather than
    // refused here: a caller asking for longer than the operator allows means "as long as you allow".
    let recallMaxTimeMS: number | undefined;
    if (a['maxTimeMS'] != null) {
      if (typeof a['maxTimeMS'] !== 'number' || !Number.isInteger(a['maxTimeMS']) || a['maxTimeMS'] < 1) {
        throw new Error('maxTimeMS must be a positive integer (milliseconds)');
      }
      recallMaxTimeMS = a['maxTimeMS'];
    }
    /** Collected across every member/space so a partial answer is declared once, not per space. */
    const degraded: string[] = [];

    // A floor above its own ceiling is refused, not resolved. Same message as REST.
    if (minPerType && maxPerType) {
      for (const [t, floor] of Object.entries(minPerType) as [RecallKnowledgeType, number][]) {
        const ceiling = maxPerType[t];
        if (ceiling !== undefined && floor > ceiling) {
          throw new Error(`minPerType.${t} (${floor}) is greater than maxPerType.${t} (${ceiling}) — the two contradict, so neither can be applied`);
        }
      }
    }

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
      const all = (await Promise.all(memberIds.map(mid => recall(mid, query, topK, tags, types, minPerType, minScore, filter, { maxPerType, maxTimeMS: recallMaxTimeMS, degraded })))).flat();
      // Same rule as everywhere else: rankOf, not `.score`. See the note on the REST recall route.
      all.sort((x, y) => rankOf(y) - rankOf(x));
      // And the ceiling is re-applied to the merged set for the same reason it is on the REST route: each
      // member honoured it alone, so N members would multiply it.
      seeds = maxPerType
        ? mergeRecallResults([], all, topK, undefined, maxPerType)
        : all.slice(0, topK);
      traverseSpaces = memberIds;
    } else {
      seeds = await recallGlobal(accessibleSpaceIds, query, topK, tags, types, minPerType, minScore, filter, { maxPerType, maxTimeMS: recallMaxTimeMS, degraded });
      traverseSpaces = accessibleSpaceIds;
    }

    if (traverse === 0) {
      const output = {
        results: seeds.map(r => ({
          score: r.score,
          spaceId: r.spaceId,
          type: r.type,
          record: toRecallRecord(r, { includeContent }),
        })),
        count: seeds.length,
        // Only when something degraded — an always-present field that is almost always empty is one an agent
        // learns to skip, and this is the field that matters on the call where the answer came back thin.
        ...(degraded.length > 0 ? { degraded } : {}),
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(output) }] };
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
      ...seeds.map(r => ({ score: r.score, source: 'recall' as const, hops: 0, path: [], spaceId: r.spaceId, type: r.type, record: toRecallRecord(r, { includeContent }) })),
      ...neighbours.map(n => ({ score: null, source: 'traverse' as const, hops: n.hops, path: n.path, spaceId: n.spaceId, type: 'entity', record: entityDocToRecord(n.record) })),
    ];
    const output = {
      results, count: results.length, traverseDepth: traverse,
      ...(degraded.length > 0 ? { degraded } : {}),
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(output) }] };
  },
};

export const find_similarTool: ToolHandler = {
  name: 'find_similar',
  description: 'Find entries with high vector similarity to an existing entry. Use for deduplication, "more like this", and merge detection. Uses the entry\'s stored embedding — no re-embedding. Provide `space` to scope to one space, or omit it to search across all accessible spaces (like recall).',
  spaceRequired: false,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            space: s.optionalSpace,
            entryId: uuidSchema('UUID v4 of the source entry.'),
            entryType: { type: 'string', enum: ['memory', 'entity', 'edge', 'chrono', 'file'], description: 'Knowledge type of the source entry.' },
            includeContent: { type: 'boolean', default: true, description: 'Whether to return each file chunk’s `content` (default true). Same meaning as on `recall`: false returns locations and metadata only.' },
            targetTypes: {
              type: 'array',
              items: { type: 'string', enum: ['memory', 'entity', 'edge', 'chrono', 'file'] },
              description: 'Which knowledge types to search in. Omit to search all types.',
            },
            topK: { type: 'number', minimum: 1, maximum: 100, default: 10, description: 'Max results to return (clamped to 1–100). Default 10.' },
            minScore: unitScoreSchema('Minimum cosine similarity threshold (0.0–1.0). Results below this are excluded.'),
            traverse: {
              type: 'number', minimum: 0, maximum: MAX_RECALL_TRAVERSE, default: 0,
              description: `Optional graph-expansion depth (integer 0–${MAX_RECALL_TRAVERSE}, default 0). When > 0, each similar match is expanded along knowledge-graph edges up to this many hops and the connected entities are returned alongside the matches (annotated with source, hops, and path). With traverse > 0 the response is JSON instead of the plain text summary.`,
            },
            crossSpace: { type: 'boolean', default: false, description: 'DEPRECATED — omit `space` instead to search all accessible spaces. When true, forces a cross-space search even if `space` is given.' },
          },
          required: ['entryId', 'entryType'],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a, callSpace, accessibleSpaceIds } = ctx;
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

    let traverse = 0;
    if (a['traverse'] != null) {
      if (typeof a['traverse'] !== 'number' || !Number.isInteger(a['traverse']) || a['traverse'] < 0 || a['traverse'] > MAX_RECALL_TRAVERSE) {
        throw new Error(`traverse must be an integer between 0 and ${MAX_RECALL_TRAVERSE}`);
      }
      traverse = a['traverse'];
    }

    // Locate the source entry: with a space, use it; without, try each accessible space (first match
    // wins — the lookup fails fast before any search, so misses are cheap).
    const { candidateBases, searchIds } = resolveFindSimilarScope(callSpace || undefined, crossSpace, accessibleSpaceIds, resolveMemberSpaces);
    let result: Awaited<ReturnType<typeof findSimilar>> | undefined;
    let usedBase: string | undefined;
    for (const base of candidateBases) {
      try {
        result = await findSimilar(base, entryId, entryType as RecallKnowledgeType, topK, targetTypes, minScore, searchIds);
        usedBase = base;
        break;
      } catch (e) {
        if (e instanceof NotFoundError && candidateBases.length > 1) continue;
        throw e;
      }
    }
    if (!result || !usedBase) throw new NotFoundError(`Entry '${entryId}' not found in any accessible space (type: ${entryType}).`);

    const crossSpaceMode = !callSpace || crossSpace;

    if (traverse === 0) {
      const lines: string[] = [];
      lines.push(`Source: [${result.source.type}] ${formatRecallSummary(result.source)} (ID: ${result.source._id})`);
      if (result.results.length === 0) {
        lines.push('No similar entries found.');
      } else {
        for (let i = 0; i < result.results.length; i++) {
          const r = result.results[i]!;
          const spaceLabel = crossSpaceMode ? ` [${r.spaceId}]` : '';
          lines.push(`[${i + 1}]${spaceLabel} [${r.type}] (score: ${r.score?.toFixed(3) ?? 'n/a'}) ${formatRecallSummary(r)}`);
        }
      }
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }

    // Graph-augmented: expand the similar seeds along edges (mirrors recall's traverse), JSON output.
    const includeContent = a['includeContent'] !== false;
    const traverseSpaces = searchIds ?? [usedBase];
    const totalCap = topK * (traverse + 1) * 4;
    const neighbours = await traverseRecallSeeds(
      traverseSpaces,
      result.results.map(sd => ({ _id: sd._id, spaceId: sd.spaceId })),
      traverse,
      Math.max(0, totalCap - result.results.length),
    );
    const results: McpRecallTraverseItem[] = [
      ...result.results.map(r => ({ score: r.score, source: 'recall' as const, hops: 0, path: [], spaceId: r.spaceId, type: r.type, record: toRecallRecord(r, { includeContent }) })),
      ...neighbours.map(n => ({ score: null, source: 'traverse' as const, hops: n.hops, path: n.path, spaceId: n.spaceId, type: 'entity', record: entityDocToRecord(n.record) })),
    ];
    const output = {
      source: { type: result.source.type, id: result.source._id, summary: formatRecallSummary(result.source) },
      results, count: results.length, traverseDepth: traverse,
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(output) }] };
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
            filter: {
              type: 'object',
              description: `MongoDB filter document. Only these operators are allowed (any other $-operator is rejected): ${QUERY_FILTER_OPERATORS.join(', ')}. Nesting is capped at depth 8. $regex must be a string, length-limited, and rejected if it risks catastrophic backtracking; $options is allowed only alongside $regex and only with flags i, m, s, x. Results are ordered seq/updatedAt/createdAt descending — there is no sort parameter.`,
            },
            projection: {
              type: 'object',
              description: 'Fields to include (1) or exclude (0). The `embedding` field is always excluded and cannot be re-included.',
            },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Max documents to return (clamped to 1–100). Default 20.' },
            maxTimeMS: { type: 'number', minimum: 1, maximum: 10000, default: 5000, description: 'Server-side query timeout in ms. Default 5000, hard-capped at 10000.' },
          },
          required: ['space', 'collection', 'filter'],
          additionalProperties: false,
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
          text: JSON.stringify(docs),
        },
      ],
    };
  },
};
