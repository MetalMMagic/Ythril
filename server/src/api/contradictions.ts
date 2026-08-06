/**
 * Contradiction review API (F-REVIEW slice 4) — the Review tab's Contradictions sub-view.
 *
 * Mirrors `api/duplicates.ts` deliberately: same space-scoping, same sticky-dismissal contract, same
 * shapes. The Review tab shows both under one vocabulary, so the two APIs should not drift.
 *
 * Where it differs is what a candidate MEANS. A duplicate carries a similarity `score`; a contradiction
 * carries a **basis** — `structured-field` (deterministic: the records set the same single-valued property
 * to different values, and the offending fields are listed) or `nli` (a model's opinion, with its
 * confidence). The list preserves that distinction rather than flattening both into one number, because a
 * reviewer needs to tell "these disagree on `port`" from "a model thinks these disagree".
 *
 * Resolution is also different. Duplicates merge; contradictions do not — two records that disagree are
 * both real, and which one is wrong is a judgement call. So `resolve` records HOW it was settled
 * (`edited` — someone corrected a record; `linked` — a contradicts/supersedes edge was drawn instead) and
 * leaves the records themselves to the normal edit paths.
 */
import { Router } from 'express';
import { requireAuth, requireAdminMfa, denyReadOnly } from '../auth/middleware.js';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { col, asFilter, asUpdate } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import { pairContentHash } from '../brain/dupe-scanner.js';
import { scanSpace } from '../brain/contradiction-scanner.js';
import { nliConfigured } from '../brain/nli-client.js';
import type { ContradictionCandidateDoc } from '../config/types.js';

export const contradictionsRouter = Router();

const collectionFor = (spaceId: string) => col<ContradictionCandidateDoc>(`${spaceId}_contradiction_candidates`);

/** Space IDs the authenticated token may access (empty/absent allow-list = all spaces). */
function accessibleSpaces(tokenSpaces?: string[]): string[] {
  const all = getConfig().spaces.map(s => s.id);
  if (!tokenSpaces || tokenSpaces.length === 0) return all;
  return all.filter(id => tokenSpaces.includes(id));
}

function toRecord(c: ContradictionCandidateDoc) {
  return {
    id: c._id,
    spaceId: c.spaceId,
    type: c.type,
    aId: c.aId,
    aSummary: c.aSummary,
    bId: c.bId,
    bSummary: c.bSummary,
    basis: c.basis,
    confidence: c.confidence,
    // Present only for a structured verdict — this is what lets the UI name the disagreement instead of
    // just asserting one.
    ...(c.fields ? { fields: c.fields } : {}),
    // A confident verdict on the first page of a long record reads exactly like a confident verdict on the
    // record, so the reviewer is told which one they are looking at.
    ...(c.truncated ? { truncated: true } : {}),
    status: c.status,
    ...(c.resolution ? { resolution: c.resolution } : {}),
    detectedAt: c.detectedAt,
    updatedAt: c.updatedAt,
  };
}

// GET /api/contradictions?status=open&space=<id>
contradictionsRouter.get('/', globalRateLimit, requireAuth, async (req, res) => {
  try {
    const statusRaw = req.query['status'];
    const status = statusRaw === 'dismissed' || statusRaw === 'resolved' || statusRaw === 'all' ? statusRaw : 'open';
    const spaceFilter = typeof req.query['space'] === 'string' ? req.query['space'] : undefined;

    let spaces = accessibleSpaces(req.authToken?.spaces);
    if (spaceFilter) spaces = spaces.filter(id => id === spaceFilter);

    const results: ContradictionCandidateDoc[] = [];
    for (const spaceId of spaces) {
      const q = status === 'all' ? { spaceId } : { spaceId, status };
      const docs = await collectionFor(spaceId)
        .find(asFilter<ContradictionCandidateDoc>(q))
        // Deterministic findings first (confidence 1), then the model's most confident. Within a tie the
        // newest, so a reviewer meets fresh disagreements rather than re-reading the same old ones.
        .sort({ confidence: -1, detectedAt: -1 })
        .limit(500)
        .toArray() as ContradictionCandidateDoc[];
      results.push(...docs);
    }
    results.sort((a, b) => (b.confidence - a.confidence) || b.detectedAt.localeCompare(a.detectedAt));
    // Cap the merged cross-space result, as duplicates does — a many-space token must not materialise
    // 500 x spaces rows.
    // `nliConfigured` rides along because the client has to explain an EMPTY list, and it cannot tell
    // "nothing disagrees" from "the judge never ran" without knowing this. It used to guess, and always
    // guessed the alarming answer: the empty state asserted "contradiction detection is not running yet —
    // it needs an NLI model" unconditionally, so a genuinely clean space was told it was broken.
    //
    // Reported here rather than fetched separately: this is the request the view already makes, the
    // media-processing config endpoint is admin-scoped (a reviewer would get a 403 and be back to
    // guessing), and a second source could disagree with this one.
    //
    // Note it is NOT "is detection running". The structured pass runs with no model at all — see
    // `scanSpace`, which uses `['structured']` when nothing is configured. This says only whether the
    // model-judged pass is among the ones that run.
    res.json({ contradictions: results.slice(0, 500).map(toRecord), nliConfigured: nliConfigured() });
  } catch (err) {
    log.error(`GET /api/contradictions: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/contradictions/:id/dismiss — reviewed, not a real disagreement.
// Captures the pair's content fingerprint so a later re-embed / re-sync / index rebuild (which bump seq
// without changing content) will NOT resurface it, while a real edit to either record will.
contradictionsRouter.post('/:id/dismiss', globalRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const id = req.params['id'] as string;
    for (const spaceId of accessibleSpaces(req.authToken?.spaces)) {
      const coll = collectionFor(spaceId);
      const doc = await coll.findOne(asFilter<ContradictionCandidateDoc>({ _id: id })) as ContradictionCandidateDoc | null;
      if (!doc) continue;
      const dismissedContentHash = await pairContentHash(spaceId, doc.type, doc.aId, doc.bId);
      await coll.updateOne(
        asFilter<ContradictionCandidateDoc>({ _id: id }),
        asUpdate<ContradictionCandidateDoc>({ $set: { status: 'dismissed', dismissedContentHash, updatedAt: new Date().toISOString() } }),
      );
      res.json({ status: 'dismissed' });
      return;
    }
    res.status(404).json({ error: 'Contradiction candidate not found' });
  } catch (err) {
    log.error(`POST /api/contradictions/:id/dismiss: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/contradictions/:id/reopen — bring a dismissed pair back onto the review list.
// Only matches a currently-dismissed pair: reopening an open or resolved one is a 404, not a silent no-op.
contradictionsRouter.post('/:id/reopen', globalRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const id = req.params['id'] as string;
    for (const spaceId of accessibleSpaces(req.authToken?.spaces)) {
      const r = await collectionFor(spaceId).updateOne(
        asFilter<ContradictionCandidateDoc>({ _id: id, status: 'dismissed' }),
        asUpdate<ContradictionCandidateDoc>({ $set: { status: 'open', updatedAt: new Date().toISOString() }, $unset: { dismissedContentHash: '' } }),
      );
      if (r.matchedCount > 0) { res.json({ status: 'open' }); return; }
    }
    res.status(404).json({ error: 'Dismissed contradiction candidate not found' });
  } catch (err) {
    log.error(`POST /api/contradictions/:id/reopen: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/contradictions/:id/resolve  { resolution: 'edited' | 'linked' }
// Contradictions are NOT merged. Two records that disagree are both real and which one is wrong is a
// judgement call, so this records HOW a human settled it and leaves the records to the normal edit paths.
contradictionsRouter.post('/:id/resolve', globalRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const id = req.params['id'] as string;
    const resolution = (req.body as { resolution?: unknown } | undefined)?.resolution;
    if (resolution !== 'edited' && resolution !== 'linked') {
      res.status(400).json({ error: "resolution must be 'edited' or 'linked'" });
      return;
    }
    for (const spaceId of accessibleSpaces(req.authToken?.spaces)) {
      const r = await collectionFor(spaceId).updateOne(
        asFilter<ContradictionCandidateDoc>({ _id: id }),
        asUpdate<ContradictionCandidateDoc>({ $set: { status: 'resolved', resolution, updatedAt: new Date().toISOString() } }),
      );
      if (r.matchedCount > 0) { res.json({ status: 'resolved', resolution }); return; }
    }
    res.status(404).json({ error: 'Contradiction candidate not found' });
  } catch (err) {
    log.error(`POST /api/contradictions/:id/resolve: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/contradictions/scan?space=<id> — run the sweep now instead of waiting for the schedule.
// Admin + MFA, like the duplicate scan: it is a model-spending operation over a whole space.
contradictionsRouter.post('/scan', globalRateLimit, requireAdminMfa, denyReadOnly, async (req, res) => {
  try {
    const spaceFilter = typeof req.query['space'] === 'string' ? req.query['space'] : undefined;
    const spaces = accessibleSpaces(req.authToken?.spaces).filter(id => !spaceFilter || id === spaceFilter);
    let scanned = 0, found = 0, nliStalled = false, judgedPairs = 0, modelCalls = 0, budgetExhausted = false;
    for (const spaceId of spaces) {
      const r = await scanSpace(spaceId);
      scanned += r.scanned; found += r.found; judgedPairs += r.judgedPairs; modelCalls += r.modelCalls;
      nliStalled = nliStalled || r.nliStalled;
      budgetExhausted = budgetExhausted || r.budgetExhausted;
    }
    // Two different reasons the list may be incomplete, and they are NOT interchangeable:
    //   nliStalled       the judge was unreachable — nothing was settled, the cursor is parked.
    //   budgetExhausted  the pair budget ran out — what was judged IS settled; the next run continues.
    // Neither may read as a clean result.
    //
    // Two counts, because they answer different questions and an operator needs both: `judgedPairs` is what
    // the sweep SETTLED, `modelCalls` is what it SPENT — the number their endpoint's own request log shows,
    // and the one `maxJudgedPairsPerRun` bounds. Reporting only the first is what made our report look 2×
    // short of a judge's own counter.
    res.json({ scannedSpaces: spaces.length, scanned, found, judgedPairs, modelCalls, nliStalled, budgetExhausted });
  } catch (err) {
    log.error(`POST /api/contradictions/scan: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});
