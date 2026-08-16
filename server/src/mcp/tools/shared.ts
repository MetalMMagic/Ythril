import type { RecallResult } from '../../brain/recall.js';

/** Helpers shared by the MCP tool handlers (moved out of mcp/router.ts). */

// Re-exported from the canonical definition so there is exactly one copy in the codebase.
export { UUID_V4_RE, UUID_V4_PATTERN } from '../../brain/entity-refs.js';

/** JSON-schema fragment for the per-record TTL arg (F10), shared by every MCP write tool. */
export const TTL_DAYS_SCHEMA = {
  type: ['integer', 'null'],
  minimum: 0,
  maximum: 36500,
  description:
    'Auto-delete this record after N days. Retention resolves as RECORD > SCHEMA > SPACE: this field wins '
    + 'outright (a positive integer sets the expiry; 0 or null means never expire, overriding everything); '
    + 'omit it and the record type\'s own schema window applies; failing that, the space-wide window for THIS '
    + 'KIND of record (the space sets one per kind: entities, memories, edges, chrono, files). '
    + 'Setting it is how you keep one record that the space would otherwise expire, or expire one it would '
    + 'otherwise keep. For chrono types a schema may also drop a record\'s DETAIL earlier than the record '
    + 'itself, which removes it from semantic search while the fact that it happened remains.',
} as const;

/**
 * JSON-schema fragment for `excludeFromVectorSearch`, shared by all four MCP update tools.
 *
 * One copy because the four types had already diverged on it once: the flag was wired into all four update
 * FUNCTIONS and then reached the REST handlers for three types and the MCP handlers for none, so the same
 * capability existed, was documented, and could not be used from the surface an agent actually holds.
 *
 * The semantics are stated in the description rather than left to the field name, because "excluded from
 * vector search" reads like a query-time filter and is not one: the vector is REMOVED. Recall cannot reach
 * the record even deliberately; structured reads still return it in full.
 *
 * ## "traverse" was ambiguous, and the ambiguity cost a question
 *
 * The description used to list `traverse` among the things that still reach an excluded record, which is
 * true of BOTH traversals and reads as neither. Owner, 2026-08-15: *"excludefromvector does also exclude
 * from recalls traversal? ambigous and i want entries to be findable via traversal even if they are not
 * embedded themselves."*
 *
 * The answer is no, and the reason is structural rather than a policy anyone chose: recall's `traverse`
 * expansion walks EDGES out of a match, so it never consults a vector, and `recall-graph.ts` filters on
 * nothing but the edge. So both the `traverse` tool and `recall(traverse: n)` reach an excluded record.
 * Saying which two is what the sentence was missing — a reader had to already know there were two.
 */
export const EXCLUDE_FROM_VECTOR_SEARCH_SCHEMA = {
  type: 'boolean',
  description:
    'Retire this record from semantic RANKING (true), or return it to it (false). Implemented as the ABSENCE '
    + 'of a vector, NOT a query-time filter: an excluded record cannot be RANKED by recall even '
    + 'deliberately, because there is no vector to rank. Everything that does not rank still reaches it in '
    + 'full — query, list, get, the `traverse` tool, AND recall\'s own `traverse` expansion, which walks '
    + 'edges out of a match and never consults a vector. So a record excluded here is still findable through '
    + 'its relationships; it just stops competing on meaning. Toggling back to false re-embeds it. May be the '
    + 'only field you send — retiring a record is a complete edit in itself.',
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

/**
 * Shared JSON-Schema fragments so `tools/list` fully describes every input (F1 self-describing surface).
 * The MCP dispatcher does not enforce inputSchema (handlers validate manually), so these keywords are the
 * machine-readable contract an agent reads to discover valid values/bounds — kept in lockstep with the
 * handler/brain validators they mirror.
 */

/** A UUID-v4 id argument (case-insensitive), matching `UUID_V4_RE`. */
const UUID_V4_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
export function uuidSchema(description: string) {
  return { type: 'string', pattern: UUID_V4_PATTERN, description } as const;
}

/** A 0.0–1.0 score/threshold argument. */
export function unitScoreSchema(description: string) {
  return { type: 'number', minimum: 0, maximum: 1, description } as const;
}

/**
 * The chrono `recurrence` block, shared by `create_chrono` and `update_chrono`.
 *
 * It was two near-identical literals differing only in the word "Optional", and `freq` — the one REQUIRED
 * field — had no description in either copy. Two copies of one schema is the shape this repo produces most,
 * so it is one function called twice rather than a second literal kept in step by hand.
 *
 * The trap is in the lead sentence and it is worth stating on both tools: the rule is STORED and validated
 * (`parseRecurrence`), and nothing anywhere expands it. It describes the entry; it does not generate more.
 */
export function recurrenceSchema(lead: string) {
  return {
    type: 'object',
    description: lead + ' e.g. { freq: "weekly", interval: 1, until: "2027-01-01T00:00:00Z" }. '
      + 'IT DESCRIBES THE ENTRY AND GENERATES NOTHING — no further entries are created from it, and no '
      + 'listing expands it into occurrences. If you need each occurrence to be findable by date, write '
      + 'each one.',
    properties: {
      freq: {
        type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'],
        description: 'How often the entry repeats. The only required field of the block, and the four values '
          + 'listed are the whole set — anything else is refused by name rather than ignored.',
      },
      interval: { type: 'integer', minimum: 1, default: 1, description: 'Repeat every N periods (positive integer, default 1).' },
      until: { type: 'string', description: 'Optional ISO 8601 date the repetition stops at. Omit for open-ended.' },
    },
    required: ['freq'],
    additionalProperties: false,
  } as const;
}

/** MongoDB operators the structured `query` filter accepts — mirrors `ALLOWED_OPERATORS` (brain/query.ts). */
export const QUERY_FILTER_OPERATORS = [
  '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$and', '$or', '$nor', '$not',
  '$exists', '$type', '$regex', '$options', '$all', '$elemMatch', '$size', '$mod',
] as const;

/**
 * `propertyNames` pattern for the recall filter's keys — mirrors `ALLOWED_FILTER_KEY_PREFIXES`
 * (brain/filter.ts): `properties.<path>`, or exactly `tags`/`type`/`name`/`status`/`label` (optionally
 * dot-suffixed). Encodes the injection-prevention allowlist so agents see which keys are legal.
 */
export const RECALL_FILTER_KEY_PATTERN = '^(properties\\..+|(tags|type|name|status|label)(\\..+)?)$';

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

/**
 * A recall result, shrunk for an MCP response.
 *
 * **Every field here is multiplied by `topK` and paid for in tokens by whoever called the tool.** That is
 * the whole reason this function exists rather than returning the result object: the REST caller is a
 * program and can afford detail, the MCP caller is a model's context window and cannot.
 *
 * Two things are dropped unconditionally because they carry no information a caller does not already
 * have, not to save space at the cost of usefulness:
 *
 *  - `embeddingModel` — identical for every record in a space. Instance configuration, not a per-record
 *    signal, and it was being repeated on every row.
 *  - `seq` — the per-space monotonic counter that sync orders replication by. It is not an input to any
 *    tool, nothing outside `sync/*` reads it, and it means nothing to a model. A caller that genuinely
 *    needs it can read the record by `_id`.
 *
 * `createdAt` / `updatedAt` deliberately STAY. They cost about the same as `seq` did and, unlike it,
 * answer a question a caller actually asks — whether what it just found is still current.
 *  - `matchedText` — the concatenated string that was fed to the embedding model. For a file chunk it is
 *    `headingText + ' ' + content`; for a media chunk it is byte-identical to `content`; for the other
 *    types it is a rendering of fields the record already carries. So it was returning the passage TWICE
 *    per result — measurably the largest single waste in the response — and the copy it duplicated is
 *    the better one: `content` is a named field with a defined meaning, `matchedText` is a blob. Owner,
 *    2026-07-29: *"I want the content if not flagged false. matched text does not interest me really."*
 *    Checked before removing: audio, video and image chunks all write the transcript/caption to BOTH
 *    `content` and `matchedText`, so nothing is only in the blob.
 *
 * `includeContent: false` additionally drops the passage body itself — see the tool schema.
 */
export function toRecallRecord(r: RecallResult, opts: { includeContent?: boolean } = {}): Record<string, unknown> {
  const includeContent = opts.includeContent !== false;
  const common: Record<string, unknown> = { _id: r._id };
  if (r.createdAt !== undefined) common['createdAt'] = r.createdAt;
  if (r.updatedAt !== undefined) common['updatedAt'] = r.updatedAt;
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
    case 'file': {
      // `content` is the passage. It is what a caller asked for unless they said otherwise.
      const keepContent = includeContent && r.content !== undefined;
      return { ...common, path: r.path, ...(r.sizeBytes !== undefined ? { sizeBytes: r.sizeBytes } : {}), ...(r.parentFileId !== undefined ? { parentFileId: r.parentFileId } : {}), ...(r.chunkIndex !== undefined ? { chunkIndex: r.chunkIndex } : {}), ...(r.headingText !== undefined ? { headingText: r.headingText } : {}), ...(keepContent ? { content: r.content } : {}) };
    }
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


