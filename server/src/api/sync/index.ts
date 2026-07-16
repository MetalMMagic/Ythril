/**
 * Sync protocol endpoints — called by remote peer instances.
 *
 * Route prefix: /api/sync
 * Authentication: validated against the network member's tokenHash using the
 * same Bearer token mechanism as client tokens, but via a separate lookup
 * that checks network member hashes rather than named PATs.
 *
 * Was a single 1713-line api/sync.ts with 24 routes (A17.6). Each sub-router declares full paths, so
 * every URL is unchanged. The ejection guard below stays on the parent and is registered BEFORE the
 * sub-routers, so it still runs ahead of every sync endpoint exactly as it did in the monolith.
 */
import { Router } from 'express';
import { getConfig } from '../../config/loader.js';
import { syncDocsRouter } from './docs.js';
import { syncTombstonesRouter } from './tombstones.js';
import { syncManifestRouter } from './manifest.js';
import { syncMembersRouter } from './members.js';
import { syncVotesRouter } from './votes.js';
import { syncWarmRouter } from './warm.js';

export const syncRouter = Router();

// ── Ejection guard (all sync endpoints) ─────────────────────────────────────
// If this instance has been removed from a network by vote, refuse every sync
// request scoped to that network — data endpoints carry the networkId in the
// query string or body, gossip endpoints in the path (guarded again below).
// Without this, ex-peers could keep syncing data because the network config is
// deleted on ejection and the space-scope check falls back to "space exists".
syncRouter.use((req, res, next) => {
  const nid = (req.query['networkId'] ?? (req.body as Record<string, unknown> | undefined)?.['networkId']) as string | undefined;
  if (nid && typeof nid === 'string' && getConfig().ejectedFromNetworks?.includes(nid)) {
    res.status(401).json({ error: 'ejected' });
    return;
  }
  next();
});

syncRouter.use(syncDocsRouter);
syncRouter.use(syncTombstonesRouter);
syncRouter.use(syncManifestRouter);
syncRouter.use(syncMembersRouter);
syncRouter.use(syncVotesRouter);
syncRouter.use(syncWarmRouter);
