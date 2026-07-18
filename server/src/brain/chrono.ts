import { v4 as uuidv4 } from 'uuid';
import { authorRef } from '../config/author.js';
import { col, asFilter, asDoc, asUpdate, asBulk } from '../db/mongo.js';
import { nextSeq, reserveSeqBlock } from '../util/seq.js';
import { parseLimit, parseSkip } from '../util/pagination.js';
import { embed } from './embedding.js';
import { chronoEmbedText } from './embed-text.js';
import { getConfig } from '../config/loader.js';
import { stampExpiryOnCreate, applyExpiryToUpdate } from './ttl.js';
import { emitWebhookEvent, type WebhookActor } from '../webhooks/dispatcher.js';
import type { ChronoEntry, ChronoType, ChronoStatus, TombstoneDoc } from '../config/types.js';


const RECURRENCE_FREQ = ['daily', 'weekly', 'monthly', 'yearly'] as const;

/**
 * Validate and normalise a `recurrence` block.
 *
 * Shared by REST and MCP. REST previously destructured `recurrence` straight out of the
 * request body and handed it to createChrono with NO shape check — unlike every sibling
 * field — so an arbitrary object could be persisted and later fed to date logic. MCP did
 * not expose it at all, so recurring entries were unreachable for agents.
 *
 * Returns `{ ok: true, value }` (value `undefined` when absent), or `{ ok: false, error }`.
 */
export function parseRecurrence(
  raw: unknown,
): { ok: true; value: ChronoEntry['recurrence'] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: undefined };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'recurrence must be an object' };
  }
  const r = raw as Record<string, unknown>;

  const freq = r['freq'];
  if (typeof freq !== 'string' || !(RECURRENCE_FREQ as readonly string[]).includes(freq)) {
    return { ok: false, error: `recurrence.freq must be one of: ${RECURRENCE_FREQ.join(', ')}` };
  }

  // `interval` is required by the type. Default it rather than persisting a half-formed
  // block that would later read as NaN.
  let interval = 1;
  if (r['interval'] !== undefined) {
    if (typeof r['interval'] !== 'number' || !Number.isInteger(r['interval']) || r['interval'] < 1) {
      return { ok: false, error: 'recurrence.interval must be a positive integer' };
    }
    interval = r['interval'];
  }

  let until: string | undefined;
  if (r['until'] !== undefined) {
    if (typeof r['until'] !== 'string' || Number.isNaN(Date.parse(r['until']))) {
      return { ok: false, error: 'recurrence.until must be an ISO 8601 date string' };
    }
    until = r['until'];
  }

  return {
    ok: true,
    value: { freq: freq as 'daily' | 'weekly' | 'monthly' | 'yearly', interval, ...(until ? { until } : {}) },
  };
}

/** Derive the text to embed for a chrono entry (type + status + title + description + tags). */
export async function createChrono(
  spaceId: string,
  fields: {
    title: string;
    type: ChronoType;
    startsAt: string;
    description?: string;
    endsAt?: string;
    status?: ChronoStatus;
    confidence?: number;
    tags?: string[];
    entityIds?: string[];
    memoryIds?: string[];
    properties?: Record<string, string | number | boolean>;
    recurrence?: ChronoEntry['recurrence'];
  },
  actor?: WebhookActor,
  ttlDays?: number | null,
): Promise<ChronoEntry> {
  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const status = fields.status ?? 'upcoming';
  const tags = fields.tags ?? [];

  // Embed kind + status + title + description + tags + properties (best-effort)
  let embeddingFields: { embedding?: number[]; embeddingModel?: string; matchedText?: string } = {};
  try {
    const embedText = chronoEmbedText(fields.title, fields.type, status, fields.description, tags, fields.properties);
    const embResult = await embed(embedText);
    embeddingFields = { embedding: embResult.vector, embeddingModel: embResult.model, matchedText: embedText };
  } catch { /* embedding unavailable — chrono stored without vector */ }

  const doc: ChronoEntry = {
    _id: uuidv4(),
    spaceId,
    title: fields.title,
    type: fields.type,
    startsAt: fields.startsAt,
    status,
    tags,
    entityIds: fields.entityIds ?? [],
    memoryIds: fields.memoryIds ?? [],
    author: authorRef(),
    createdAt: now,
    updatedAt: now,
    seq,
    ...embeddingFields,
  };
  if (fields.description !== undefined) doc.description = fields.description;
  if (fields.endsAt !== undefined) doc.endsAt = fields.endsAt;
  if (fields.confidence !== undefined) doc.confidence = fields.confidence;
  if (fields.properties !== undefined) doc.properties = fields.properties;
  if (fields.recurrence !== undefined) doc.recurrence = fields.recurrence;

  stampExpiryOnCreate(spaceId, doc, ttlDays);
  await col<ChronoEntry>(`${spaceId}_chrono`).insertOne(asDoc<ChronoEntry>(doc));
  if (actor) emitWebhookEvent({ event: 'chrono.created', spaceId, entry: { ...doc, embedding: undefined }, ...actor });
  return doc;
}

export async function updateChrono(
  spaceId: string,
  id: string,
  updates: Partial<Pick<ChronoEntry, 'title' | 'description' | 'type' | 'startsAt' | 'endsAt' | 'status' | 'confidence' | 'tags' | 'entityIds' | 'memoryIds' | 'properties' | 'recurrence'>>,
  actor?: WebhookActor,
  ttlDays?: number | null,
): Promise<ChronoEntry | null> {
  const existing = await col<ChronoEntry>(`${spaceId}_chrono`).findOne(asFilter<ChronoEntry>({ _id: id, spaceId })) as ChronoEntry | null;
  if (!existing) return null;

  const seq = await nextSeq(spaceId);
  const now = new Date().toISOString();
  const $set: Record<string, unknown> = { updatedAt: now, seq };
  const $unset: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) $set[k] = v;
  }

  // Re-embed if any embedding-relevant field changes
  if (
    updates.title !== undefined ||
    updates.description !== undefined ||
    updates.type !== undefined ||
    updates.status !== undefined ||
    updates.tags !== undefined ||
    updates.properties !== undefined
  ) {
    const newTitle = updates.title ?? existing.title;
    const newKind = updates.type ?? existing.type;
    const newStatus = updates.status ?? existing.status;
    const newDesc = updates.description !== undefined ? updates.description : existing.description;
    const newTags = updates.tags ?? existing.tags;
    const newProps = updates.properties !== undefined ? updates.properties : existing.properties;
    try {
      const embedText = chronoEmbedText(newTitle, newKind, newStatus, newDesc, newTags, newProps);
      const embResult = await embed(embedText);
      $set['embedding'] = embResult.vector;
      $set['embeddingModel'] = embResult.model;
      $set['matchedText'] = embedText;
    } catch { /* embedding unavailable — keep existing embedding */ }
  }

  applyExpiryToUpdate(spaceId, ttlDays, existing._expireAt != null, $set, $unset); // F10
  const updateOp: Record<string, unknown> = { $set };
  if (Object.keys($unset).length > 0) updateOp['$unset'] = $unset;
  await col<ChronoEntry>(`${spaceId}_chrono`).updateOne(
    asFilter<ChronoEntry>({ _id: id }),
    asUpdate<ChronoEntry>(updateOp),
  );
  const updatedChrono = { ...existing, ...($set as Partial<ChronoEntry>) } as ChronoEntry;
  if ('_expireAt' in $unset) delete (updatedChrono as { _expireAt?: unknown })._expireAt;
  if (actor) emitWebhookEvent({ event: 'chrono.updated', spaceId, entry: { ...updatedChrono, embedding: undefined }, ...actor });
  return updatedChrono;
}

/**
 * C5 — derive `overdue` on read.
 *
 * An entry is overdue when its due moment (its `endsAt`, or `startsAt` when it has no end) has passed
 * and it is not yet `completed`/`cancelled`. Nothing writes the `overdue` status — it is computed at
 * read time so there is no write churn, no scheduled sweep, and no sync traffic, and it is always
 * accurate to the second. Because the STORED status stays `upcoming`/`active`, this must be applied at
 * every chrono read path (see `getChronoById` and `listChrono`), and the `listChrono` status filter is
 * translated to match (below).
 *
 * Known limitation: the entry's embedding is built from the stored status, so a derived-`overdue` entry
 * still embeds as `upcoming` — semantic search for "overdue" won't rank it. That is the trade-off for
 * not re-embedding on a clock tick.
 */
export function deriveChronoStatus(
  entry: Pick<ChronoEntry, 'status' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): ChronoStatus {
  if (entry.status !== 'upcoming' && entry.status !== 'active') return entry.status;
  const due = entry.endsAt ?? entry.startsAt;
  return due && new Date(due).getTime() < now.getTime() ? 'overdue' : entry.status;
}

/** Return the entry with its derived status applied (a shallow copy only when the status changes). */
function withDerivedStatus(entry: ChronoEntry, now: Date = new Date()): ChronoEntry {
  const status = deriveChronoStatus(entry, now);
  return status === entry.status ? entry : { ...entry, status };
}

export async function getChronoById(spaceId: string, id: string): Promise<ChronoEntry | null> {
  const entry = await col<ChronoEntry>(`${spaceId}_chrono`).findOne(asFilter<ChronoEntry>({ _id: id, spaceId })) as ChronoEntry | null;
  return entry ? withDerivedStatus(entry) : null;
}

export interface ChronoFilter {
  status?: string;
  type?: string;
  /** ALL of these tags must be present (AND semantics). */
  tags?: string[];
  /** ANY of these tags must be present (OR semantics). */
  tagsAny?: string[];
  /** ISO 8601 — return entries with createdAt > after */
  after?: string;
  /** ISO 8601 — return entries with createdAt < before */
  before?: string;
  /** Case-insensitive substring match on title and description. */
  search?: string;
}

export async function listChrono(
  spaceId: string,
  filter: ChronoFilter = {},
  limit = 50,
  skip = 0,
): Promise<ChronoEntry[]> {
  const now = new Date();
  const query: Record<string, unknown> = { spaceId };

  // Status filter is `overdue`-aware (C5): `overdue` is derived from the due moment, never stored.
  if (filter.status !== undefined) {
    // The due moment: endsAt, or startsAt when there is no end. `$toDate` so mixed-offset ISO strings
    // compare chronologically, not lexically.
    const refDate = { $toDate: { $ifNull: ['$endsAt', '$startsAt'] } };
    if (filter.status === 'overdue') {
      query['status'] = { $in: ['upcoming', 'active'] };
      query['$expr'] = { $lt: [refDate, now] };
    } else if (filter.status === 'upcoming' || filter.status === 'active') {
      // Exclude entries that are now derived-overdue so they don't surface under their stored status.
      query['status'] = filter.status;
      query['$expr'] = { $gte: [refDate, now] };
    } else {
      query['status'] = filter.status; // completed / cancelled — no derivation
    }
  }
  if (filter.type !== undefined) query['type'] = filter.type;

  // tags ALL (AND): every tag in the array must be present
  if (filter.tags && filter.tags.length > 0) {
    query['tags'] = { $all: filter.tags };
  }

  // tagsAny (OR): at least one tag in the array must be present
  // If both tags and tagsAny are provided, combine with $and
  if (filter.tagsAny && filter.tagsAny.length > 0) {
    if (filter.tags && filter.tags.length > 0) {
      // Already have an $all constraint on tags — wrap both with $and
      query['$and'] = [
        { tags: { $all: filter.tags } },
        { tags: { $in: filter.tagsAny } },
      ];
      delete query['tags'];
    } else {
      query['tags'] = { $in: filter.tagsAny };
    }
  }

  // Date range on createdAt
  if (filter.after !== undefined || filter.before !== undefined) {
    const range: Record<string, string> = {};
    if (filter.after !== undefined) range['$gt'] = filter.after;
    if (filter.before !== undefined) range['$lt'] = filter.before;
    query['createdAt'] = range;
  }

  // Full-text substring search on title and/or description
  if (filter.search && filter.search.trim()) {
    const regex = { $regex: filter.search.trim(), $options: 'i' };
    query['$or'] = [{ title: regex }, { description: regex }];
  }

  const entries = await col<ChronoEntry>(`${spaceId}_chrono`)
    .find(asFilter<ChronoEntry>(query))
    .sort({ createdAt: -1 })
    .skip(parseSkip(skip))
    .limit(parseLimit(limit, 20, 1000))
    .toArray() as ChronoEntry[];
  // Present the derived status (same `now` as the filter, so the returned status agrees with it).
  return entries.map(e => withDerivedStatus(e, now));
}

export async function deleteChrono(
  spaceId: string,
  chronoId: string,
  actor?: WebhookActor,
): Promise<boolean> {
  const existing = await col<ChronoEntry>(`${spaceId}_chrono`)
    .findOne(asFilter<ChronoEntry>({ _id: chronoId, spaceId }), { projection: { seq: 1 } }) as { seq?: number } | null;
  const seq = await nextSeq(spaceId);
  const result = await col<ChronoEntry>(`${spaceId}_chrono`).deleteOne({
    _id: chronoId,
    spaceId,
  });
  if (result.deletedCount === 0) return false;

  const tombstone: TombstoneDoc = {
    _id: chronoId,
    type: 'chrono',
    spaceId,
    deletedAt: new Date().toISOString(),
    instanceId: getConfig().instanceId,
    seq,
    ...(existing?.seq !== undefined ? { originalSeq: existing.seq } : {}),
  };
  await col<TombstoneDoc>(`${spaceId}_tombstones`).replaceOne(
    asFilter<TombstoneDoc>({ _id: chronoId }),
    asDoc<TombstoneDoc>(tombstone),
    { upsert: true },
  );
  if (actor) emitWebhookEvent({ event: 'chrono.deleted', spaceId, entry: { _id: chronoId }, ...actor });
  return true;
}

/** Bulk-delete all chrono entries in a space, writing a tombstone per deleted doc. */
export async function bulkDeleteChrono(spaceId: string): Promise<number> {
  const coll = col<ChronoEntry>(`${spaceId}_chrono`);
  const ids = await coll.find({}, { projection: { _id: 1, seq: 1 } }).toArray() as { _id: string; seq?: number }[];
  if (ids.length === 0) return 0;

  const now = new Date().toISOString();
  const instanceId = getConfig().instanceId;
  const tombstones: TombstoneDoc[] = [];

  // Reserve the whole tombstone seq range in ONE round trip. This used to call nextSeq()
  // per document — a sequential round trip each — so a 100k-document wipe paid 100k awaited
  // round trips before the delete even began. Gaps are harmless (sync compares seqs with `>`);
  // reuse would not be, which is why the block is reserved up-front and never rolled back.
  const firstSeq = await reserveSeqBlock(spaceId, ids.length);
  let seqCursor = firstSeq;

  for (const doc of ids) {
    const seq = seqCursor++;
    tombstones.push({
      _id: doc._id,
      type: 'chrono',
      spaceId,
      deletedAt: now,
      instanceId,
      seq,
      ...(doc.seq !== undefined ? { originalSeq: doc.seq } : {}),
    });
  }

  const ops = tombstones.map(t => ({
    replaceOne: { filter: { _id: t._id }, replacement: t, upsert: true },
  }));
  await col<TombstoneDoc>(`${spaceId}_tombstones`).bulkWrite(asBulk<TombstoneDoc>(ops));
  await coll.deleteMany({});
  return ids.length;
}
