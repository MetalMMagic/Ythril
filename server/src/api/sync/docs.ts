/**
 * Peer document sync — the four record families (memories/entities/edges/chrono) plus batch-upsert.
 *
 * Split out of the api/sync.ts monolith (A17.6); handlers are unchanged.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { col, asFilter, asDoc, asUpdate } from '../../db/mongo.js';
import { enqueueIngestedRecord } from '../../brain/embed-queue.js';
import { syncRateLimit } from '../../rate-limit/middleware.js';
import { getConfig } from '../../config/loader.js';
import { listTombstones } from '../../brain/tombstones.js';
import { requireAuth, denyReadOnly } from '../../auth/middleware.js';
import { log } from '../../util/log.js';
import { nextSeq, bumpSeq, isSeqImplausible, MAX_INGEST_SEQ } from '../../util/seq.js';
import { getAllowedChronoTypes } from '../../spaces/schema-validation.js';
import type { MemoryDoc, EntityDoc, EdgeDoc, ChronoEntry, TombstoneDoc } from '../../config/types.js';
import { checkEdgeLinkViolations, checkEntityIdLinkViolations, MAX_FORK_DEPTH, IncomingMemoryDoc, IncomingEntityDoc, IncomingEdgeDoc, IncomingChronoDoc, encodeCursor, decodeCursor, forkChainDepth, rejectImplausibleSeq, callerPeerId, spaceAllowed, isNonPeerSyncWrite, NON_PEER_WRITE_MESSAGE, isDirectionalWriteBlocked } from './_shared.js';

export const syncDocsRouter = Router();

syncDocsRouter.get('/memories', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId, sinceSeq = '0', limit = '100', cursor, full: fullParam } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const sinceVal = cursor ? decodeCursor(cursor) : parseInt(sinceSeq, 10);
    const pageSize = Math.min(parseInt(limit, 10) || 100, 500);
    const returnFull = fullParam === 'true';

    const rawDocs = returnFull
      ? await col<MemoryDoc>(`${spaceId}_memories`).find(asFilter<MemoryDoc>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).toArray() as MemoryDoc[]
      : await col<MemoryDoc>(`${spaceId}_memories`).find(asFilter<MemoryDoc>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).project({ _id: 1, seq: 1 }).toArray() as { _id: string; seq: number }[];

    const hasMore = rawDocs.length > pageSize;
    const items: typeof rawDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;
    const nextCursor = hasMore ? encodeCursor((items[items.length - 1] as { seq: number }).seq) : null;

    // Tombstone stubs are appended within the current page's seq range only.
    // Capping at the last memory item's seq prevents tombstones with high seq
    // from appearing on both the current page AND the next page (cursor duplicate bug).
    const pageMaxSeq = items.length > 0 ? (items[items.length - 1] as { seq: number }).seq : sinceVal;
    const tombstones = await listTombstones(spaceId, sinceVal, pageSize);
    // Exclude tombstones for docs already returned on previous pages (originalSeq <= sinceVal)
    // and tombstones for docs in the current page's items list (within-page dedup).
    const itemIds = new Set(items.map(i => (i as { _id: string })._id));
    const tombs = tombstones
      .filter(t =>
        t.type === 'memory' &&
        t.seq <= pageMaxSeq &&
        !itemIds.has(t._id) &&
        (t.originalSeq === undefined || t.originalSeq > sinceVal),
      )
      .map(t => ({ _id: t._id, seq: t.seq, deletedAt: t.deletedAt }));

    res.json({ items: [...items, ...tombs].sort((a, b) => (a as { seq: number }).seq - (b as { seq: number }).seq), nextCursor });
  } catch (err) {
    log.error(`sync GET memories: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


/**
 * GET /api/sync/memories/:id?spaceId=
 * Fetch a single full memory document.
 */
syncDocsRouter.get('/memories/:id', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const doc = await col<MemoryDoc>(`${spaceId}_memories`).findOne(asFilter<MemoryDoc>({ _id: req.params['id'] }));
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(doc);
  } catch (err) {
    log.error(`sync GET memory/:id: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


/**
 * POST /api/sync/memories?spaceId=&networkId=
 * Upsert a memory received from a peer.
 * Conflict rule: higher seq wins; equal seq forks.
 */
syncDocsRouter.post('/memories', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (isNonPeerSyncWrite(req.authToken as Record<string, unknown>)) { res.status(403).json({ error: NON_PEER_WRITE_MESSAGE }); return; }
    if (isDirectionalWriteBlocked(spaceId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Directional network: write not permitted from this peer' }); return; }

    const parsed = IncomingMemoryDoc.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid memory document' });
      return;
    }
    const incoming = parsed.data as MemoryDoc;
    if (rejectImplausibleSeq(spaceId, incoming.seq, res, callerPeerId(req.authToken as Record<string, unknown>))) return;

    // Check for tombstone — if a tombstone with >= seq exists, skip
    const tombstone = await col<TombstoneDoc>(`${spaceId}_tombstones`)
      .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'memory' })) as TombstoneDoc | null;
    if (tombstone && tombstone.seq >= incoming.seq) {
      res.status(200).json({ status: 'tombstoned' });
      return;
    }
    // Clean up stale tombstone superseded by the incoming document
    if (tombstone) {
      await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));
    }

    const existing = await col<MemoryDoc>(`${spaceId}_memories`)
      .findOne(asFilter<MemoryDoc>({ _id: incoming._id })) as MemoryDoc | null;

    if (!existing) {
      // No local copy — insert directly
      await col<MemoryDoc>(`${spaceId}_memories`).insertOne(asDoc<MemoryDoc>(incoming));
      // A peer strips `embedding` before sending — it is derived, and the peer may run a
      // different model — so this record landed unsearchable. Queue it a vector.
      await enqueueIngestedRecord(spaceId, 'memory', incoming);
      const peerInst = (req.authToken as Record<string, unknown>)?.['peerInstanceId'] as string ?? 'unknown';
      checkEntityIdLinkViolations(spaceId, incoming._id, 'memory', incoming.entityIds, peerInst).catch(() => {});
      res.status(200).json({ status: 'inserted' });
      return;
    }

    if (incoming.seq > existing.seq) {
      // Remote is newer — overwrite
      await col<MemoryDoc>(`${spaceId}_memories`).replaceOne(asFilter<MemoryDoc>({ _id: incoming._id }), asDoc<MemoryDoc>(incoming));
      // A peer strips `embedding` before sending — it is derived, and the peer may run a
      // different model — so this record landed unsearchable. Queue it a vector.
      await enqueueIngestedRecord(spaceId, 'memory', incoming);
      const peerInst = (req.authToken as Record<string, unknown>)?.['peerInstanceId'] as string ?? 'unknown';
      checkEntityIdLinkViolations(spaceId, incoming._id, 'memory', incoming.entityIds, peerInst).catch(() => {});
      res.status(200).json({ status: 'updated' });
      return;
    }

    if (incoming.seq === existing.seq && incoming.fact !== existing.fact) {
      // Concurrent independent edit — fork; but cap both chain depth and fan-out.
      const depth = await forkChainDepth(spaceId, incoming._id);
      if (depth >= MAX_FORK_DEPTH) {
        res.status(400).json({ error: `Fork depth limit (${MAX_FORK_DEPTH}) exceeded for _id '${incoming._id}'` });
        return;
      }
      // Also cap fan-out: count how many forks already point to this document.
      const siblingCount = await col<MemoryDoc>(`${spaceId}_memories`)
        .countDocuments(asFilter<MemoryDoc>({ forkOf: incoming._id }), { limit: MAX_FORK_DEPTH + 1 });
      if (siblingCount >= MAX_FORK_DEPTH) {
        res.status(400).json({ error: `Fork depth limit (${MAX_FORK_DEPTH}) exceeded for _id '${incoming._id}'` });
        return;
      }
      const forkSeq = await nextSeq(spaceId);
      const fork: MemoryDoc = {
        ...incoming,
        _id: uuidv4(),
        forkOf: incoming._id,
        seq: forkSeq,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await col<MemoryDoc>(`${spaceId}_memories`).insertOne(asDoc<MemoryDoc>(fork));
      // A peer strips `embedding` before sending — it is derived, and the peer may run a
      // different model — so this record landed unsearchable. Queue it a vector.
      await enqueueIngestedRecord(spaceId, 'memory', fork);
      res.status(200).json({ status: 'forked', forkId: fork._id });
      return;
    }

    res.status(200).json({ status: 'skipped' });
  } catch (err) {
    log.error(`sync POST memories: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ENTITIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

syncDocsRouter.get('/entities', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId, sinceSeq = '0', limit = '100', cursor, full: fullParam } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const sinceVal = cursor ? decodeCursor(cursor) : parseInt(sinceSeq, 10);
    const pageSize = Math.min(parseInt(limit, 10) || 100, 500);
    const returnFull = fullParam === 'true';

    const rawDocs = returnFull
      ? await col<EntityDoc>(`${spaceId}_entities`).find(asFilter<EntityDoc>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).toArray() as EntityDoc[]
      : await col<EntityDoc>(`${spaceId}_entities`).find(asFilter<EntityDoc>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).project({ _id: 1, seq: 1 }).toArray() as { _id: string; seq: number }[];

    const hasMore = rawDocs.length > pageSize;
    const items: typeof rawDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;
    const nextCursor = hasMore ? encodeCursor((items[items.length - 1] as { seq: number }).seq) : null;

    const pageMaxSeq = items.length > 0 ? (items[items.length - 1] as { seq: number }).seq : sinceVal;
    const tombstones = await listTombstones(spaceId, sinceVal, pageSize);
    const itemIds = new Set(items.map(i => (i as { _id: string })._id));
    const tombs = tombstones
      .filter(t =>
        t.type === 'entity' &&
        t.seq <= pageMaxSeq &&
        !itemIds.has(t._id) &&
        (t.originalSeq === undefined || t.originalSeq > sinceVal),
      )
      .map(t => ({ _id: t._id, seq: t.seq, deletedAt: t.deletedAt }));

    res.json({ items: [...items, ...tombs].sort((a, b) => (a as { seq: number }).seq - (b as { seq: number }).seq), nextCursor });
  } catch (err) {
    log.error(`sync GET entities: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


syncDocsRouter.get('/entities/:id', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const doc = await col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: req.params['id'] }));
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});


syncDocsRouter.post('/entities', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (isNonPeerSyncWrite(req.authToken as Record<string, unknown>)) { res.status(403).json({ error: NON_PEER_WRITE_MESSAGE }); return; }
    if (isDirectionalWriteBlocked(spaceId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Directional network: write not permitted from this peer' }); return; }

    const parsed = IncomingEntityDoc.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid entity document' });
      return;
    }
    const incoming = parsed.data as EntityDoc;
    if (rejectImplausibleSeq(spaceId, incoming.seq, res, callerPeerId(req.authToken as Record<string, unknown>))) return;

    const tombstone = await col<TombstoneDoc>(`${spaceId}_tombstones`)
      .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'entity' })) as TombstoneDoc | null;
    if (tombstone && tombstone.seq >= incoming.seq) {
      res.status(200).json({ status: 'tombstoned' });
      return;
    }
    if (tombstone) {
      await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));
    }

    await col<EntityDoc>(`${spaceId}_entities`).updateOne(
      asFilter<EntityDoc>({ _id: incoming._id }),
      asUpdate<EntityDoc>({ $setOnInsert: incoming }),
      { upsert: true },
    );

    // Merge tags on conflict
    const existing = await col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: incoming._id })) as EntityDoc;
    if (existing && incoming.seq > existing.seq) {
      await col<EntityDoc>(`${spaceId}_entities`).replaceOne(asFilter<EntityDoc>({ _id: incoming._id }), asDoc<EntityDoc>(incoming));
      // A peer strips `embedding` before sending — it is derived, and the peer may run a
      // different model — so this record landed unsearchable. Queue it a vector.
      await enqueueIngestedRecord(spaceId, 'entity', incoming);
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    log.error(`sync POST entities: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EDGES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

syncDocsRouter.get('/edges', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId, sinceSeq = '0', limit = '100', cursor, full: fullParam } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const sinceVal = cursor ? decodeCursor(cursor) : parseInt(sinceSeq, 10);
    const pageSize = Math.min(parseInt(limit, 10) || 100, 500);
    const returnFull = fullParam === 'true';

    const rawDocs = returnFull
      ? await col<EdgeDoc>(`${spaceId}_edges`).find(asFilter<EdgeDoc>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).toArray() as EdgeDoc[]
      : await col<EdgeDoc>(`${spaceId}_edges`).find(asFilter<EdgeDoc>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).project({ _id: 1, seq: 1 }).toArray() as { _id: string; seq: number }[];

    const hasMore = rawDocs.length > pageSize;
    const items: typeof rawDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;
    const nextCursor = hasMore ? encodeCursor((items[items.length - 1] as { seq: number }).seq) : null;

    const pageMaxSeq = items.length > 0 ? (items[items.length - 1] as { seq: number }).seq : sinceVal;
    const tombstones = await listTombstones(spaceId, sinceVal, pageSize);
    const itemIds = new Set(items.map(i => (i as { _id: string })._id));
    const tombs = tombstones
      .filter(t =>
        t.type === 'edge' &&
        t.seq <= pageMaxSeq &&
        !itemIds.has(t._id) &&
        (t.originalSeq === undefined || t.originalSeq > sinceVal),
      )
      .map(t => ({ _id: t._id, seq: t.seq, deletedAt: t.deletedAt }));

    res.json({ items: [...items, ...tombs].sort((a, b) => (a as { seq: number }).seq - (b as { seq: number }).seq), nextCursor });
  } catch (err) {
    log.error(`sync GET edges: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


syncDocsRouter.get('/edges/:id', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const doc = await col<EdgeDoc>(`${spaceId}_edges`).findOne(asFilter<EdgeDoc>({ _id: req.params['id'] }));
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});


syncDocsRouter.post('/edges', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (isNonPeerSyncWrite(req.authToken as Record<string, unknown>)) { res.status(403).json({ error: NON_PEER_WRITE_MESSAGE }); return; }
    if (isDirectionalWriteBlocked(spaceId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Directional network: write not permitted from this peer' }); return; }

    const parsed = IncomingEdgeDoc.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid edge document' });
      return;
    }
    const incoming = parsed.data as EdgeDoc;
    if (rejectImplausibleSeq(spaceId, incoming.seq, res, callerPeerId(req.authToken as Record<string, unknown>))) return;

    const tombstone = await col<TombstoneDoc>(`${spaceId}_tombstones`)
      .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'edge' })) as TombstoneDoc | null;
    if (tombstone && tombstone.seq >= incoming.seq) {
      res.status(200).json({ status: 'tombstoned' });
      return;
    }
    if (tombstone) {
      await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));
    }

    const existing = await col<EdgeDoc>(`${spaceId}_edges`).findOne(asFilter<EdgeDoc>({ _id: incoming._id })) as EdgeDoc | null;
    if (!existing || incoming.seq > existing.seq) {
      await col<EdgeDoc>(`${spaceId}_edges`).replaceOne(
        asFilter<EdgeDoc>({ _id: incoming._id }),
        asDoc<EdgeDoc>(incoming),
        { upsert: true },
      );
      // A peer strips `embedding` before sending — it is derived, and the peer may run a
      // different model — so this record landed unsearchable. Queue it a vector.
      await enqueueIngestedRecord(spaceId, 'edge', incoming);
    }

    // Fire-and-forget: check strict linkage violations after ingest
    const peerInst = (req.authToken as Record<string, unknown>)?.['peerInstanceId'] as string ?? 'unknown';
    checkEdgeLinkViolations(spaceId, incoming, peerInst).catch(() => {});

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    log.error(`sync POST edges: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CHRONO
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

syncDocsRouter.get('/chrono', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId, sinceSeq = '0', limit = '100', cursor, full: fullParam } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const sinceVal = cursor ? decodeCursor(cursor) : parseInt(sinceSeq, 10);
    const pageSize = Math.min(parseInt(limit, 10) || 100, 500);
    const returnFull = fullParam === 'true';

    const rawDocs = returnFull
      ? await col<ChronoEntry>(`${spaceId}_chrono`).find(asFilter<ChronoEntry>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).toArray() as ChronoEntry[]
      : await col<ChronoEntry>(`${spaceId}_chrono`).find(asFilter<ChronoEntry>({ seq: { $gt: sinceVal } })).sort({ seq: 1 }).limit(pageSize + 1).project({ _id: 1, seq: 1 }).toArray() as { _id: string; seq: number }[];

    const hasMore = rawDocs.length > pageSize;
    const items: typeof rawDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;
    const nextCursor = hasMore ? encodeCursor((items[items.length - 1] as { seq: number }).seq) : null;

    const pageMaxSeq = items.length > 0 ? (items[items.length - 1] as { seq: number }).seq : sinceVal;
    const tombstones = await listTombstones(spaceId, sinceVal, pageSize);
    const itemIds = new Set(items.map(i => (i as { _id: string })._id));
    const tombs = tombstones
      .filter(t =>
        t.type === 'chrono' &&
        t.seq <= pageMaxSeq &&
        !itemIds.has(t._id) &&
        (t.originalSeq === undefined || t.originalSeq > sinceVal),
      )
      .map(t => ({ _id: t._id, seq: t.seq, deletedAt: t.deletedAt }));

    res.json({ items: [...items, ...tombs].sort((a, b) => (a as { seq: number }).seq - (b as { seq: number }).seq), nextCursor });
  } catch (err) {
    log.error(`sync GET chrono: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


syncDocsRouter.get('/chrono/:id', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }

    const doc = await col<ChronoEntry>(`${spaceId}_chrono`).findOne(asFilter<ChronoEntry>({ _id: req.params['id'] }));
    if (!doc) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});


syncDocsRouter.post('/chrono', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (isNonPeerSyncWrite(req.authToken as Record<string, unknown>)) { res.status(403).json({ error: NON_PEER_WRITE_MESSAGE }); return; }
    if (isDirectionalWriteBlocked(spaceId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Directional network: write not permitted from this peer' }); return; }

    const parsed = IncomingChronoDoc.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid chrono document' });
      return;
    }
    const incoming = parsed.data as ChronoEntry;
    if (rejectImplausibleSeq(spaceId, incoming.seq, res, callerPeerId(req.authToken as Record<string, unknown>))) return;
    const allowedChronoTypes = getAllowedChronoTypes(getConfig().spaces.find(s => s.id === spaceId)?.meta);
    if (!allowedChronoTypes.has(incoming.type)) {
      res.status(400).json({ error: `\`type\` must be one of: ${[...allowedChronoTypes].join(', ')}` });
      return;
    }

    const tombstone = await col<TombstoneDoc>(`${spaceId}_tombstones`)
      .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'chrono' })) as TombstoneDoc | null;
    if (tombstone && tombstone.seq >= incoming.seq) {
      res.status(200).json({ status: 'tombstoned' });
      return;
    }
    if (tombstone) {
      await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));
    }

    const existing = await col<ChronoEntry>(`${spaceId}_chrono`).findOne(asFilter<ChronoEntry>({ _id: incoming._id })) as ChronoEntry | null;
    if (!existing || incoming.seq > existing.seq) {
      await col<ChronoEntry>(`${spaceId}_chrono`).replaceOne(
        asFilter<ChronoEntry>({ _id: incoming._id }),
        asDoc<ChronoEntry>(incoming),
        { upsert: true },
      );
      // A peer strips `embedding` before sending — it is derived, and the peer may run a
      // different model — so this record landed unsearchable. Queue it a vector.
      await enqueueIngestedRecord(spaceId, 'chrono', incoming);
    }

    // Fire-and-forget: check strict linkage violations after ingest
    const peerInst = (req.authToken as Record<string, unknown>)?.['peerInstanceId'] as string ?? 'unknown';
    checkEntityIdLinkViolations(spaceId, incoming._id, 'chrono', incoming.entityIds, peerInst).catch(() => {});

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    log.error(`sync POST chrono: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BATCH UPSERT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * POST /api/sync/batch-upsert?spaceId=&networkId=
 * Accept arrays of memories, entities and/or edges and upsert them all in one
 * request.  Same conflict rules as the individual POST endpoints.
 * Limits: 500 docs per type per request to cap payload size.
 */
syncDocsRouter.post('/batch-upsert', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const { spaceId, networkId } = req.query as Record<string, string>;
    if (!spaceId) { res.status(400).json({ error: 'spaceId required' }); return; }
    if (!spaceAllowed(spaceId, networkId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (isNonPeerSyncWrite(req.authToken as Record<string, unknown>)) { res.status(403).json({ error: NON_PEER_WRITE_MESSAGE }); return; }
    if (isDirectionalWriteBlocked(spaceId, req.authToken as Record<string, unknown>)) { res.status(403).json({ error: 'Directional network: write not permitted from this peer' }); return; }

    const body = req.body as { memories?: unknown[]; entities?: unknown[]; edges?: unknown[]; chrono?: unknown[] };
    const memoriesRaw = (Array.isArray(body?.memories) ? body.memories.slice(0, 500) : [])
      .flatMap(m => { const r = IncomingMemoryDoc.safeParse(m); return r.success ? [r.data as MemoryDoc] : []; });
    const entitiesRaw = (Array.isArray(body?.entities) ? body.entities.slice(0, 500) : [])
      .flatMap(e => { const r = IncomingEntityDoc.safeParse(e); return r.success ? [r.data as EntityDoc] : []; });
    const edgesRaw = (Array.isArray(body?.edges) ? body.edges.slice(0, 500) : [])
      .flatMap(e => { const r = IncomingEdgeDoc.safeParse(e); return r.success ? [r.data as EdgeDoc] : []; });
    const chronoRaw = (Array.isArray(body?.chrono) ? body.chrono.slice(0, 500) : [])
      .flatMap(c => { const r = IncomingChronoDoc.safeParse(c); return r.success ? [r.data as ChronoEntry] : []; });

    // Drop documents whose seq is too close to the protocol ceiling — one such
    // doc would otherwise drag the counter toward it via the bumpSeq below (see
    // util/seq.ts). Batch ingest already skips invalid documents silently, so
    // these are dropped with a warning, not fatal.
    const plausible = <T extends { seq: number; _id: string }>(docs: T[], kind: string): T[] =>
      docs.filter(d => {
        if (!isSeqImplausible(d.seq)) return true;
        log.warn(
          `batch-upsert: dropped ${kind} '${d._id}' with implausible seq ${d.seq} ` +
          `for space '${spaceId}' (max ingest seq ${MAX_INGEST_SEQ}) from peer ` +
          `'${callerPeerId(req.authToken as Record<string, unknown>) ?? 'unknown'}'.`,
        );
        return false;
      });
    const memories = plausible(memoriesRaw, 'memory');
    const entities = plausible(entitiesRaw, 'entity');
    const edges = plausible(edgesRaw, 'edge');
    const chrono = plausible(chronoRaw, 'chrono');

    // â”€â”€ Memories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const memStats = { inserted: 0, updated: 0, forked: 0, skipped: 0, tombstoned: 0 };
    for (const incoming of memories) {
      const tomb = await col<TombstoneDoc>(`${spaceId}_tombstones`)
        .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'memory' })) as TombstoneDoc | null;
      if (tomb && tomb.seq >= incoming.seq) { memStats.tombstoned++; continue; }
      if (tomb) await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));

      const existing = await col<MemoryDoc>(`${spaceId}_memories`)
        .findOne(asFilter<MemoryDoc>({ _id: incoming._id })) as MemoryDoc | null;
      if (!existing) {
        await col<MemoryDoc>(`${spaceId}_memories`).insertOne(asDoc<MemoryDoc>(incoming));
        // A peer strips `embedding` before sending — it is derived, and the peer may run a
        // different model — so this record landed unsearchable. Queue it a vector.
        await enqueueIngestedRecord(spaceId, 'memory', incoming);
        memStats.inserted++;
      } else if (incoming.seq > existing.seq) {
        await col<MemoryDoc>(`${spaceId}_memories`).replaceOne(asFilter<MemoryDoc>({ _id: incoming._id }), asDoc<MemoryDoc>(incoming));
        // A peer strips `embedding` before sending — it is derived, and the peer may run a
        // different model — so this record landed unsearchable. Queue it a vector.
        await enqueueIngestedRecord(spaceId, 'memory', incoming);
        memStats.updated++;
      } else if (incoming.seq === existing.seq && incoming.fact !== existing.fact) {
        // Cap fork chains to prevent unbounded growth
        const depth = await forkChainDepth(spaceId, incoming._id);
        if (depth >= MAX_FORK_DEPTH) { memStats.skipped++; continue; }

        const forkSeq = await nextSeq(spaceId);
        const fork: MemoryDoc = {
          ...incoming, _id: uuidv4(), forkOf: incoming._id, seq: forkSeq,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await col<MemoryDoc>(`${spaceId}_memories`).insertOne(asDoc<MemoryDoc>(fork));
        // A peer strips `embedding` before sending — it is derived, and the peer may run a
        // different model — so this record landed unsearchable. Queue it a vector.
        await enqueueIngestedRecord(spaceId, 'memory', fork);
        memStats.forked++;
      } else {
        memStats.skipped++;
      }
    }

    // â”€â”€ Entities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const entStats = { upserted: 0, skipped: 0, tombstoned: 0 };
    for (const incoming of entities) {
      const tomb = await col<TombstoneDoc>(`${spaceId}_tombstones`)
        .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'entity' })) as TombstoneDoc | null;
      if (tomb && tomb.seq >= incoming.seq) { entStats.tombstoned++; continue; }
      if (tomb) await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));

      const existing = await col<EntityDoc>(`${spaceId}_entities`)
        .findOne(asFilter<EntityDoc>({ _id: incoming._id })) as EntityDoc | null;
      if (!existing || incoming.seq > existing.seq) {
        await col<EntityDoc>(`${spaceId}_entities`).replaceOne(
          asFilter<EntityDoc>({ _id: incoming._id }), asDoc<EntityDoc>(incoming), { upsert: true },
        );
        // A peer strips `embedding` before sending — it is derived, and the peer may run a
        // different model — so this record landed unsearchable. Queue it a vector.
        await enqueueIngestedRecord(spaceId, 'entity', incoming);
        entStats.upserted++;
      } else {
        entStats.skipped++;
      }
    }

    // â”€â”€ Edges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const edgeStats = { upserted: 0, skipped: 0, tombstoned: 0 };
    for (const incoming of edges) {
      const tomb = await col<TombstoneDoc>(`${spaceId}_tombstones`)
        .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'edge' })) as TombstoneDoc | null;
      if (tomb && tomb.seq >= incoming.seq) { edgeStats.tombstoned++; continue; }
      if (tomb) await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));

      const existing = await col<EdgeDoc>(`${spaceId}_edges`)
        .findOne(asFilter<EdgeDoc>({ _id: incoming._id })) as EdgeDoc | null;
      if (!existing || incoming.seq > existing.seq) {
        await col<EdgeDoc>(`${spaceId}_edges`).replaceOne(
          asFilter<EdgeDoc>({ _id: incoming._id }), asDoc<EdgeDoc>(incoming), { upsert: true },
        );
        // A peer strips `embedding` before sending — it is derived, and the peer may run a
        // different model — so this record landed unsearchable. Queue it a vector.
        await enqueueIngestedRecord(spaceId, 'edge', incoming);
        edgeStats.upserted++;
      } else {
        edgeStats.skipped++;
      }
    }

    // â”€â”€ Chrono â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const chronoStats = { upserted: 0, skipped: 0, tombstoned: 0 };
    for (const incoming of chrono) {
      const tomb = await col<TombstoneDoc>(`${spaceId}_tombstones`)
        .findOne(asFilter<TombstoneDoc>({ _id: incoming._id, type: 'chrono' })) as TombstoneDoc | null;
      if (tomb && tomb.seq >= incoming.seq) { chronoStats.tombstoned++; continue; }
      if (tomb) await col<TombstoneDoc>(`${spaceId}_tombstones`).deleteOne(asFilter<TombstoneDoc>({ _id: incoming._id }));

      const existing = await col<ChronoEntry>(`${spaceId}_chrono`)
        .findOne(asFilter<ChronoEntry>({ _id: incoming._id })) as ChronoEntry | null;
      if (!existing || incoming.seq > existing.seq) {
        await col<ChronoEntry>(`${spaceId}_chrono`).replaceOne(
          asFilter<ChronoEntry>({ _id: incoming._id }), asDoc<ChronoEntry>(incoming), { upsert: true },
        );
        // A peer strips `embedding` before sending — it is derived, and the peer may run a
        // different model — so this record landed unsearchable. Queue it a vector.
        await enqueueIngestedRecord(spaceId, 'chrono', incoming);
        chronoStats.upserted++;
      } else {
        chronoStats.skipped++;
      }
    }

    res.status(200).json({ status: 'ok', memories: memStats, entities: entStats, edges: edgeStats, chrono: chronoStats });

    // Bump the local seq counter so future local writes always get a seq higher
    // than any document received via push.  Fire-and-forget after the response.
    const allSeqs = [
      ...memories.map(m => m.seq ?? 0),
      ...entities.map(e => e.seq ?? 0),
      ...edges.map(e => e.seq ?? 0),
      ...chrono.map(c => c.seq ?? 0),
    ];
    const maxIncoming = Math.max(0, ...allSeqs);
    if (maxIncoming > 0) bumpSeq(spaceId, maxIncoming).catch(() => {});
  } catch (err) {
    log.error(`sync POST batch-upsert: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});
