/**
 * Duplicate-candidate review API.
 *
 * Lists the near-duplicate pairs found by the background scanner
 * (`server/src/brain/dupe-scanner.ts`), lets a reviewer dismiss them, and lets
 * an admin trigger an on-demand full re-scan. Read/dismiss follow the conflicts
 * router's model (space-scoped via the token); the write-heavy scan trigger is
 * admin + non-read-only.
 */

import { Router } from 'express';
import { requireAuth, requireAdminMfa, denyReadOnly } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { col, asFilter, asUpdate } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import { scanSpace } from '../brain/dupe-scanner.js';
import { computeMergePlan, applyResolutions, executeMerge } from '../brain/merge.js';
import { emitWebhookEvent } from '../webhooks/dispatcher.js';
import type { DupeCandidateDoc } from '../config/types.js';

/** Find a candidate across the caller's accessible spaces. */
async function findCandidate(id: string, tokenSpaces?: string[]): Promise<{ doc: DupeCandidateDoc; spaceId: string } | null> {
  const cfg = getConfig();
  const all = cfg.spaces.map(s => s.id);
  const spaces = !tokenSpaces || tokenSpaces.length === 0 ? all : all.filter(s => tokenSpaces.includes(s));
  for (const spaceId of spaces) {
    const doc = await col<DupeCandidateDoc>(`${spaceId}_dupe_candidates`).findOne(asFilter<DupeCandidateDoc>({ _id: id })) as DupeCandidateDoc | null;
    if (doc) return { doc, spaceId };
  }
  return null;
}

export const duplicatesRouter = Router();

/** Return the space IDs the authenticated token is allowed to access. */
function accessibleSpaces(tokenSpaces?: string[]): string[] {
  const cfg = getConfig();
  const all = cfg.spaces.map(s => s.id);
  if (!tokenSpaces || tokenSpaces.length === 0) return all;
  return all.filter(id => tokenSpaces.includes(id));
}

function toRecord(c: DupeCandidateDoc) {
  return {
    id: c._id,
    spaceId: c.spaceId,
    type: c.type,
    aId: c.aId,
    aSummary: c.aSummary,
    bId: c.bId,
    bSummary: c.bSummary,
    score: c.score,
    status: c.status,
    ...(c.resolution ? { resolution: c.resolution } : {}),
    detectedAt: c.detectedAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/duplicates?status=open&space=<id> — list candidate pairs across accessible spaces.
duplicatesRouter.get('/', globalRateLimit, requireAuth, async (req, res) => {
  try {
    const statusRaw = req.query['status'];
    const status = statusRaw === 'dismissed' || statusRaw === 'all' ? statusRaw : 'open';
    const spaceFilter = typeof req.query['space'] === 'string' ? req.query['space'] : undefined;

    let spaces = accessibleSpaces(req.authToken?.spaces);
    if (spaceFilter) spaces = spaces.filter(id => id === spaceFilter);

    const results: DupeCandidateDoc[] = [];
    for (const spaceId of spaces) {
      // Served by the {status, score, detectedAt} index (de-prefixed in P10): `status` is the
      // leading equality field and the sort by (score desc, detectedAt desc) follows it. The
      // redundant `spaceId` equality is a harmless residual (the collection is already per-space).
      const q = status === 'all' ? { spaceId } : { spaceId, status };
      const docs = await col<DupeCandidateDoc>(`${spaceId}_dupe_candidates`)
        .find(asFilter<DupeCandidateDoc>(q))
        .sort({ score: -1, detectedAt: -1 })
        .limit(500)
        .toArray() as DupeCandidateDoc[];
      results.push(...docs);
    }
    results.sort((a, b) => (b.score - a.score) || b.detectedAt.localeCompare(a.detectedAt));
    // Cap the merged cross-space result so a many-space token can't materialise 500×spaces rows.
    res.json({ duplicates: results.slice(0, 500).map(toRecord) });
  } catch (err) {
    log.error(`GET /api/duplicates: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/duplicates/:id/dismiss — mark a candidate pair reviewed/not-a-duplicate.
duplicatesRouter.post('/:id/dismiss', globalRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const id = req.params['id'] as string;
    const spaces = accessibleSpaces(req.authToken?.spaces);
    for (const spaceId of spaces) {
      const r = await col<DupeCandidateDoc>(`${spaceId}_dupe_candidates`).updateOne(
        asFilter<DupeCandidateDoc>({ _id: id }),
        asUpdate<DupeCandidateDoc>({ $set: { status: 'dismissed', updatedAt: new Date().toISOString() } }),
      );
      if (r.matchedCount > 0) { res.json({ status: 'dismissed' }); return; }
    }
    res.status(404).json({ error: 'Duplicate candidate not found' });
  } catch (err) {
    log.error(`POST /api/duplicates/:id/dismiss: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/duplicates/:id/merge — merge an entity candidate pair (lossless).
// Survivor = the older record (lower seq), or the space's dupeMergeSurvivor policy.
// Returns 409 with the merge plan if the pair has a property-value conflict.
duplicatesRouter.post('/:id/merge', globalRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const found = await findCandidate(req.params['id'] as string, req.authToken?.spaces);
    if (!found) { res.status(404).json({ error: 'Duplicate candidate not found' }); return; }
    const { doc, spaceId } = found;
    if (doc.type !== 'entity') { res.status(400).json({ error: 'Merge is only supported for entity candidates' }); return; }

    const pref = getConfig().spaces.find(s => s.id === spaceId)?.dupeMergeSurvivor ?? 'older';
    const olderId = doc.aSeq <= doc.bSeq ? doc.aId : doc.bId;
    const newerId = doc.aSeq <= doc.bSeq ? doc.bId : doc.aId;
    const survivorId = pref === 'newer' ? newerId : olderId;
    const absorbedId = pref === 'newer' ? olderId : newerId;

    const plan = await computeMergePlan(spaceId, survivorId, absorbedId, []);
    if ('error' in plan) { res.status(plan.status).json({ error: plan.error }); return; }
    if (!plan.fullyResolved) { res.status(409).json({ error: 'Property value conflict — resolve manually', plan: plan.plan }); return; }

    const mergedProps = applyResolutions(plan.survivor.properties ?? {}, plan.absorbed.properties ?? {}, plan.plan.propertyConflicts, plan.plan.absorbedOnlyProperties);
    const result = await executeMerge(spaceId, plan.survivor, plan.absorbed, mergedProps);
    emitWebhookEvent({ event: 'entity.merged', spaceId, entry: { survivor: { ...result.entity, embedding: undefined }, absorbedId: plan.absorbed._id } });
    emitWebhookEvent({ event: 'entity.updated', spaceId, entry: { ...result.entity, embedding: undefined } });

    await col<DupeCandidateDoc>(`${spaceId}_dupe_candidates`).updateOne(
      asFilter<DupeCandidateDoc>({ _id: doc._id }),
      asUpdate<DupeCandidateDoc>({ $set: { status: 'resolved', resolution: 'merged', updatedAt: new Date().toISOString() } }),
    );
    res.json({ status: 'merged', survivorId: result.entity._id });
  } catch (err) {
    log.error(`POST /api/duplicates/:id/merge: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/duplicates/scan?space=<id> — trigger an on-demand full re-scan.
// Admin + non-read-only: it is write-heavy (populates the candidates collection).
duplicatesRouter.post('/scan', globalRateLimit, requireAdminMfa, denyReadOnly, async (req, res) => {
  try {
    const spaceFilter = typeof req.query['space'] === 'string' ? req.query['space'] : undefined;
    const cfg = getConfig();
    // Intersect with the token's space allowlist — a space-restricted admin must
    // not be able to trigger destructive rules (automerge/notify) on spaces it
    // cannot access.
    const allowed = new Set(accessibleSpaces(req.authToken?.spaces));
    const targets = cfg.spaces
      .filter(s => !s.proxyFor && allowed.has(s.id) && (!spaceFilter || s.id === spaceFilter))
      .map(s => s.id);
    if (spaceFilter && targets.length === 0) { res.status(404).json({ error: `Space '${spaceFilter}' not found or not accessible` }); return; }

    let scanned = 0;
    let pairs = 0;
    for (const spaceId of targets) {
      const r = await scanSpace(spaceId, { reset: true });
      scanned += r.scanned;
      pairs += r.pairs;
    }
    res.json({ scannedSpaces: targets.length, scanned, pairs });
  } catch (err) {
    log.error(`POST /api/duplicates/scan: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});
