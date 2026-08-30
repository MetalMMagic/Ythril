/**
 * Shared machinery for the /api/sync sub-routers.
 *
 * Extracted when the 1713-line api/sync.ts was split by concern (A17.6): the incoming-document
 * schemas, peer/space authorisation, cursor codec, fork-depth and implausible-seq guards, and the
 * strict-linkage violation recorders. Every sub-router draws on some of this.
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { col, asFilter, asDoc } from '../../db/mongo.js';
import { getConfig } from '../../config/loader.js';
import { reachesSpace } from '../../auth/space-reach.js';
import { isInstanceAdmin } from '../../auth/instance-admin.js';
import type { TokenRights } from '../../config/rights-shape.js';
import { log } from '../../util/log.js';
import { isSeqImplausible, MAX_INGEST_SEQ } from '../../util/seq.js';
import { isStrictLinkage } from '../../spaces/proxy.js';
import { emitWebhookEvent } from '../../webhooks/dispatcher.js';
import type { MemoryDoc, EntityDoc, EdgeDoc, LinkViolationDoc } from '../../config/types.js';

export const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



/**
 * Record a link violation detected during sync ingest.
 * Fire-and-forget: violations are informational, never block sync.
 */
export async function recordLinkViolation(
  spaceId: string,
  docId: string,
  docType: LinkViolationDoc['docType'],
  field: string,
  reason: string,
  peerInstanceId: string,
): Promise<void> {
  try {
    const doc: LinkViolationDoc = {
      _id: uuidv4(),
      spaceId,
      docId,
      docType,
      field,
      reason,
      peerInstanceId,
      detectedAt: new Date().toISOString(),
    };
    await col<LinkViolationDoc>(`${spaceId}_link_violations`).insertOne(asDoc<LinkViolationDoc>(doc));
    emitWebhookEvent({ event: 'link_violation.created', spaceId, entry: doc as unknown as Record<string, unknown> });
  } catch (err) {
    log.error(`Failed to record link violation for ${docType} ${docId}: ${err}`);
  }
}

/**
 * Validate an edge's from/to references against strict linkage rules.
 * Records violations but never blocks the ingest.
 */
export async function checkEdgeLinkViolations(
  spaceId: string,
  edge: EdgeDoc,
  peerInstanceId: string,
): Promise<void> {
  if (!isStrictLinkage(spaceId)) return;

  for (const field of ['from', 'to'] as const) {
    const val = edge[field];
    if (!UUID_V4_RE.test(val)) {
      await recordLinkViolation(spaceId, edge._id, 'edge', field,
        `${field} '${val}' is not a valid UUID v4`, peerInstanceId);
    } else {
      const exists = await col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: val }));
      if (!exists) {
        await recordLinkViolation(spaceId, edge._id, 'edge', field,
          `${field} references non-existent entity '${val}'`, peerInstanceId);
      }
    }
  }
}

/**
 * Validate a memory/chrono document's entityIds against strict linkage rules.
 */
export async function checkEntityIdLinkViolations(
  spaceId: string,
  docId: string,
  docType: 'memory' | 'chrono',
  entityIds: string[] | undefined,
  peerInstanceId: string,
): Promise<void> {
  if (!isStrictLinkage(spaceId) || !entityIds?.length) return;

  for (const eid of entityIds) {
    if (!UUID_V4_RE.test(eid)) {
      await recordLinkViolation(spaceId, docId, docType, 'entityIds',
        `entityIds contains non-UUID value '${eid}'`, peerInstanceId);
    } else {
      const exists = await col<EntityDoc>(`${spaceId}_entities`).findOne(asFilter<EntityDoc>({ _id: eid }));
      if (!exists) {
        await recordLinkViolation(spaceId, docId, docType, 'entityIds',
          `entityIds references non-existent entity '${eid}'`, peerInstanceId);
      }
    }
  }
}

// ── Safety limits ─────────────────────────────────────────────────────────

/**
 * Upper bound on any seq value accepted from a remote peer.
 * Prevents an attacker from submitting seq = Number.MAX_SAFE_INTEGER (9007199254740991)
 * to permanently poison the high-water mark, causing all future legitimate
 * writes by other peers to be silently ignored.
 *
 * 2^50 ≈ 1.1 quadrillion — larger than any realistic counter, but safely
 * below MAX_SAFE_INTEGER so that nextSeq() arithmetic stays in safe range.
 */
export const MAX_SYNC_SEQ = 2 ** 50; // 1_125_899_906_842_624

/**
 * Maximum chain depth for forkOf links.
 * Prevents a "fork chain bomb" where an attacker creates A→B→C→...
 * by repeatedly submitting equal-seq docs with different content.
 *
 * Two independent checks enforce this:
 *  1. Chain depth: walk forkOf pointers upward — caps nested chains.
 *  2. Sibling fan-out: count existing forks of the same parent — caps
 *     repeated same-seq attacks against one document.
 */
export const MAX_FORK_DEPTH = 10;

// ── Incoming document schemas (Zod validation for peer-submitted docs) ─────

import { validateEntity, validateEdge, validateChrono, validateMemory, getSpaceMeta, type SchemaViolation }
  from '../../spaces/schema-validation.js';

export const AuthorRefSchema = z.object({
  instanceId: z.string().min(1),
  instanceLabel: z.string().min(1),
});

export const IncomingMemoryDoc = z.object({
  _id: z.string().min(1),
  spaceId: z.string().min(1),
  fact: z.string(),
  /*
   * OPTIONAL, because `MemoryDoc.embedding` is optional and requiring it here deleted records.
   *
   * A memory has no vector in two ordinary situations: its type or space suppresses embeddings, in which case
   * `embedStoredRecord` `$unset`s both this and `embeddingModel`; or its embed job has not run yet. Both are
   * valid stored documents. Requiring them here made `safeParse` reject them, and the rejection is a `flatMap`
   * returning `[]` — so the document was removed from the batch, counted in no statistic, and the receiver
   * still answered 200. The sender then advanced its watermark, and `embedStoredRecord` deliberately does not
   * bump `seq` when the vector finally lands, so the record was never offered again. Permanent, silent, and
   * one-directional.
   *
   * `IncomingEntityDoc`, `IncomingEdgeDoc` and `IncomingChronoDoc` never declared `embedding` at all — zod
   * strips unlisted keys, so their vector is discarded and the document survives. Memories were the only type
   * that required it, which is why they were the only type that vanished.
   */
  embedding: z.array(z.number()).optional(),
  tags: z.array(z.string()).max(100),
  entityIds: z.array(z.string()).max(500),
  description: z.string().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  author: AuthorRefSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  seq: z.number().int().nonnegative().max(MAX_SYNC_SEQ),
  /** Optional for the same reason as `embedding` above — the two are set and unset together. */
  embeddingModel: z.string().optional(),
  forkOf: z.string().optional(),
});

export const IncomingEntityDoc = z.object({
  _id: z.string().min(1),
  spaceId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  tags: z.array(z.string()).max(100),
  description: z.string().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  author: AuthorRefSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  seq: z.number().int().nonnegative().max(MAX_SYNC_SEQ),
});

export const IncomingEdgeDoc = z.object({
  _id: z.string().min(1),
  spaceId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string(),
  type: z.string().optional(),
  weight: z.number().optional(),
  tags: z.array(z.string()).max(100).default([]),
  description: z.string().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  author: AuthorRefSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  seq: z.number().int().nonnegative().max(MAX_SYNC_SEQ),
});

export const IncomingChronoDoc = z.object({
  _id: z.string().min(1),
  spaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  status: z.enum(['upcoming', 'active', 'completed', 'overdue', 'cancelled']),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).max(100).default([]),
  entityIds: z.array(z.string()).max(500).default([]),
  memoryIds: z.array(z.string()).max(500).default([]),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  recurrence: z.object({
    freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().positive(),
    until: z.string().optional(),
  }).optional(),
  author: AuthorRefSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  seq: z.number().int().nonnegative().max(MAX_SYNC_SEQ),
});

// ── Paginated cursor helpers ─────────────────────────────────────────────────

export function encodeCursor(seq: number): string {
  return Buffer.from(String(seq)).toString('base64url');
}
export function decodeCursor(token: string): number {
  try { return parseInt(Buffer.from(token, 'base64url').toString(), 10) || 0; }
  catch { return 0; }
}

// ── Space access guard ─────────────────────────────────────────────────────

/**
 * Walk the forkOf chain upward from a document to measure how deep
 * this fork is in the chain.  Returns 0 for a root document.
 *
 * Uses a visited set to break any hypothetical cycle in O(depth) time.
 * Hard-caps the walk at MAX_FORK_DEPTH + 1 to avoid slow queries on
 * corrupted data.
 */
export async function forkChainDepth(spaceId: string, docId: string | undefined): Promise<number> {
  if (!docId) return 0;
  const coll = col<MemoryDoc>(`${spaceId}_memories`);
  const visited = new Set<string>();
  let depth = 0;
  let currentId: string | undefined = docId;

  while (currentId && depth <= MAX_FORK_DEPTH) {
    if (visited.has(currentId)) break; // cycle guard
    visited.add(currentId);
    const doc = await coll.findOne(asFilter<MemoryDoc>({ _id: currentId })) as MemoryDoc | null;
    if (!doc?.forkOf) break;
    depth++;
    currentId = doc.forkOf;
  }
  return depth;
}

/**
 * Refuse a document whose `seq` is implausibly far ahead of the space counter
 * (see util/seq.ts — MAX_INGEST_SEQ). Responds 400 and returns true when rejected.
 */
export function rejectImplausibleSeq(
  spaceId: string,
  seq: number,
  res: import('express').Response,
  peerInstanceId?: string,
): boolean {
  if (!isSeqImplausible(seq)) return false;
  log.warn(
    `Refused document with implausible seq ${seq} for space '${spaceId}' ` +
    `from peer '${peerInstanceId ?? 'unknown'}' (max ingest seq ${MAX_INGEST_SEQ}).`,
  );
  res.status(400).json({ error: `seq ${seq} is too close to the protocol ceiling and was refused` });
  return true;
}

/** The peer identity bound to a production peer PAT (set by the invite handshake). */
export function callerPeerId(authToken: Record<string, unknown> | undefined): string | undefined {
  const v = authToken?.['peerInstanceId'];
  return typeof v === 'string' && v ? v : undefined;
}

/**
 * Networks (local view) in which `peerInstanceId` is a member.
 *
 * An EMPTY result means the token is bound to a peer we do not list as a member
 * anywhere. That happens for manually-provisioned peer tokens and for
 * single-side-configured (asymmetric) networks, where the sender holds the
 * network config and we do not. Those callers fall back to plain token-space
 * scoping — see spaceAllowed.
 */
export function peerMemberNetworks(peerInstanceId: string) {
  return getConfig().networks.filter(n => n.members.some(m => m.instanceId === peerInstanceId));
}

/**
 * Does this token's own scope reach `spaceId`? The matrix first, the legacy allowlist only as a fallback.
 *
 * ## This closes a hole, it does not tidy one
 *
 * `spaceAllowed` used to take the legacy `spaces` array as a separate parameter and open with
 * `if (tokenSpaces && !tokenSpaces.includes(spaceId)) return false`. Read that guard against a token minted
 * today: the rights editor writes `rights.perSpace` and NOTHING writes `spaces` — the owner's ruling was
 * *"only matrix from now on"*, `createToken` stores `spaces: opts.spaces` verbatim, and the mint route's own
 * refusal map tells a caller to use `rights.perSpace` instead. So `tokenSpaces` is `undefined` on a modern
 * token, the `&&` short-circuits, and the token-level check never runs.
 *
 * What is downstream of it is not a second line of defence. With no `networkId` in the query the function
 * ends at *"does this space exist?"* — so every `/api/sync/*` GET, all behind plain `requireAuth`, answered
 * for ANY space to ANY token whose reach lives only in the matrix. Writes were never exposed
 * (`isNonPeerSyncWrite` admits only peers and instance admins), so this was a read gap, and it is the exact
 * defect class this repo produces most: one rule, two implementations, and the weaker one silently reachable.
 *
 * ## Why the legacy fallback stays for now
 *
 * A token whose record predates the matrix and has not been through the load-time backfill still expresses
 * its scope in `spaces`. Dropping that branch here would REFUSE those tokens rather than widen them, which is
 * the safe direction but still an outage. It goes with the field itself in D-8d; until then the order matters
 * and is asserted: matrix if there is one, allowlist if there is not, and an absent scope of either kind means
 * unrestricted exactly as it always did.
 */
export function tokenReachesSpace(authToken: Record<string, unknown> | undefined, spaceId: string): boolean {
  const rights = authToken?.['rights'] as TokenRights | undefined;
  if (rights) return reachesSpace(rights, spaceId);
  const legacy = authToken?.['spaces'] as string[] | undefined;
  return !legacy || legacy.includes(spaceId);
}

/**
 * Returns true if the caller may touch `spaceId` (optionally within `networkId`).
 *
 * Checks, in order:
 *  1. Token space scope (a space-scoped token may only touch its own spaces).
 *  2. **Network membership** — a peer-bound token may only reach spaces shared
 *     through a network that peer is actually a member of. Space scope alone is
 *     not enough: two networks with overlapping spaces but disjoint membership
 *     would otherwise leak into each other (a peer of network X reading a space
 *     that X and Y both carry, while being no member of Y).
 *  3. The space is actually shared by that network.
 *
 * Local/admin tokens (no `peerInstanceId`) keep the previous behaviour — they
 * are this instance's own credentials, not a remote peer's.
 */
export function spaceAllowed(
  spaceId: string,
  networkId: string | undefined,
  authToken?: Record<string, unknown>,
): boolean {
  const cfg = getConfig();
  // Enforce token-level space scope before any network check.
  if (!tokenReachesSpace(authToken, spaceId)) return false;

  const peerId = callerPeerId(authToken);
  if (peerId) {
    const memberNets = peerMemberNetworks(peerId);
    if (memberNets.length > 0) {
      // A known peer: it may only reach spaces via networks it belongs to.
      const usable = networkId
        ? memberNets.filter(n => n.id === networkId)
        : memberNets;
      return usable.some(n => n.spaces.includes(spaceId));
    }
    // A peer whose join is still being voted on (or was denied) holds a
    // provisioned PAT but no membership — it must NOT fall through to plain
    // space scoping, or the vote hold would be meaningless (S9). A passed
    // round implies membership, which is handled above.
    const heldByJoinRound = cfg.networks.some(n =>
      n.pendingRounds?.some(r =>
        r.type === 'join' && r.subjectInstanceId === peerId && !r.passed));
    if (heldByJoinRound) return false;
    // Unknown peer (manual token / asymmetric network): fall through to the
    // legacy space-existence check below — the token's own scope still applies.
  }

  // If no networkId given, allow any known space
  if (!networkId) return cfg.spaces.some(s => s.id === spaceId);
  const net = cfg.networks.find(n => n.id === networkId);
  // networkId not found locally — fall back to checking the space exists.
  // This handles asymmetric networks where the caller has the network config
  // but the recipient does not (e.g. single-side configured networks).
  if (!net) return cfg.spaces.some(s => s.id === spaceId);
  return net.spaces.includes(spaceId);
}

/**
 * S10: the sync data-write surface is for peers. A write must be presented by
 * a server-issued peer token (`peerInstanceId`, set by the invite handshake or
 * minted explicitly via POST /api/tokens) or by an admin token — the local
 * operator, who could write through the regular REST API anyway. Space-scoped
 * user PATs are refused: unlike the REST API (which assigns seq/_id/author
 * server-side), sync writes carry raw sync metadata, so accepting them would
 * let any user-PAT holder forge stream state — e.g. a downstream operator in
 * a directional network pushing content upstream with a leaked upstream PAT,
 * defeating the documented one-way flow.
 *
 * Returns true if the write must be REJECTED (403).
 *
 * ## The admin half asks the matrix (D-8d)
 *
 * This read `authToken['admin']` — bracket notation, which is exactly why it survived the audit that moved
 * every other instance-admin check onto `isInstanceAdmin`. A `git grep` for `record.admin` / `.admin` in
 * dotted form does not match it, so the sweep reported clean while this one kept reading a field that was
 * being deleted.
 *
 * The consequence was not subtle and was not a 403 anybody would have puzzled over: with the field gone,
 * every admin token became a non-peer here, and the whole sync WRITE surface refused it. CI caught it as
 * fifty-one failures in brain CRUD, because the integration suite seeds records through this endpoint.
 */
export function isNonPeerSyncWrite(authToken: Record<string, unknown> | undefined): boolean {
  if (authToken && isInstanceAdmin(authToken as { admin?: boolean; rights?: TokenRights | null })) return false;
  return !callerPeerId(authToken);
}

export const NON_PEER_WRITE_MESSAGE =
  'Sync writes require a peer token (peerInstanceId) or an admin token — use the regular REST API for user writes';

/**
 * For directional networks (braintree, pubsub), reject inbound writes from
 * members whose direction is 'push'. Direction is stored from THIS instance's
 * perspective:
 *   direction='push'  → we push TO them → they must NOT push to us
 *   direction='pull'  → we pull FROM them → they may push to us (data source)
 *   direction='both'  → bidirectional → accept
 *
 * Enforcement is against an IDENTIFIED member and derived from THIS instance's
 * own membership records covering the TARGET SPACE — never from the caller-
 * supplied `networkId` query param, which a push-only peer could previously
 * simply omit (or point at a non-directional network sharing the space) to
 * slip past the guard. The write is space-level, so it is allowed only when
 * at least one of the caller's network relationships carrying that space
 * permits inbound flow (direction pull/both, or a non-directional type).
 *
 * A token with NO `peerInstanceId` never reaches this check on the write
 * endpoints (isNonPeerSyncWrite gates first); a peer that is a member of no
 * local network carrying the space is governed by token space scope and the
 * pending-join hold in spaceAllowed (braintree receivers legitimately do not
 * list their parent as a member).
 *
 * Returns true if the write should be REJECTED (403).
 */
export function isDirectionalWriteBlocked(spaceId: string, authToken: Record<string, unknown> | undefined): boolean {
  const peerInstanceId = callerPeerId(authToken);
  if (!peerInstanceId) return false;
  const nets = peerMemberNetworks(peerInstanceId).filter(n => n.spaces.includes(spaceId));
  if (nets.length === 0) return false;
  return !nets.some(n => {
    if (n.type !== 'braintree' && n.type !== 'pubsub') return true;
    const member = n.members.find(m => m.instanceId === peerInstanceId);
    // direction='push' means WE push to THEM — they should not be writing to us
    return member ? member.direction !== 'push' : false;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/sync/memories?spaceId=&networkId=&sinceSeq=&limit=&cursor=&full=
 * Returns paginated stubs by default.  Add ?full=true to return complete docs
 * in a single pass (eliminates the N per-document fetches on the pull side).
 */

/**
 * Validate an incoming record against the LOCAL space's schema, and never refuse it.
 *
 * ## Why sync validates at all, and why it does not refuse
 *
 * Owner's ruling, 2026-08-29 (P-21 = C): import, restore and sync **check, let everything in, and hand back a
 * list of what broke the rules**. Refusing is the option that hurts most here — a peer validated these records
 * against ITS schema, which may differ from yours, so a refusal discards data the sender believes it delivered
 * and no operator asked for that.
 *
 * ## What it replaces
 *
 * Across the five ingest paths in `docs.ts` there was exactly ONE validation check: the chrono type allowlist,
 * on the single-record path, which returned a 400. `batch-upsert` — the path a real peer uses, because that is
 * how a sync cycle ships more than one record — checked nothing at all. So the only check lived where the
 * traffic is not, and it did the one thing the ruling says not to do.
 *
 * ## The count is the point
 *
 * The ruling's stated cost was that a report nobody reads is the do-nothing option with extra steps, so this
 * returns violations to the caller rather than writing a log line. `batch-upsert` carries them in its per-type
 * stats; the single-record routes return them beside the stored document — all four of them, which the first
 * pass claimed in this docblock while implementing only `/chrono`. See `withSchemaViolations`.
 */
export function violationsAgainstLocalSchema(
  spaceId: string,
  kind: 'memory' | 'entity' | 'edge' | 'chrono',
  doc: Record<string, unknown>,
): SchemaViolation[] {
  const meta = getSpaceMeta(spaceId);
  if (!meta) return [];
  const properties = doc['properties'] as Record<string, unknown> | undefined;
  const tags = Array.isArray(doc['tags']) ? doc['tags'] as string[] : undefined;
  const type = typeof doc['type'] === 'string' ? doc['type'] : undefined;
  switch (kind) {
    case 'entity':
      return validateEntity(meta, { name: doc['name'] as string, type, properties });
    case 'edge':
      return validateEdge(meta, { label: doc['label'] as string, properties });
    case 'chrono':
      return validateChrono(meta, { type, properties });
    case 'memory':
      return validateMemory(meta, { type, properties });
  }
}

/**
 * Attach the violations to a single-record ingest response — the one spelling of that rule.
 *
 * ## Why this is a function and not four inline spreads
 *
 * It was four inline spreads, and only one of them was written. `/chrono` carried
 * `...(v.length > 0 ? { schemaViolations: v } : {})` while `/memories`, `/entities` and `/edges` stored the
 * peer's record and answered `{ status: 'ok' }` with nothing computed at all — so a peer shipping records one
 * at a time got silent acceptance while the same records through `batch-upsert` were counted. One rule, two
 * implementations, the weaker one winning silently, which `CLAUDE.md` names as the defect this repo produces
 * most. The docblock above even asserted the plural.
 *
 * **Absent when empty, deliberately.** A clean ingest keeps its existing response byte for byte, so nothing a
 * peer already parses changes and `schemaViolations` present always means something to look at.
 */
/**
 * Is this write failure ONLY duplicate-key rejections — the shape two peers produce independently?
 *
 * ## The stall it removes
 *
 * A new edge gets a random `uuidv4()` id, and a space carries a UNIQUE index on `{ from, to, label }`. So when
 * two peers create the same relationship independently there is one triplet under two ids, and the receiver's
 * upsert — keyed on the unknown `_id` — inserts and hits that index.
 *
 * The PULL side was fixed: `sync/engine.ts` writes with `ordered: false` and absorbs 11000. **The push side
 * was not**, and it is the worse half. `POST /api/sync/edges` and the batch loop let E11000 reach the route's
 * catch, which answers `500`; on the sender, a non-ok push `break`s without advancing `seqCursor`, and
 * `resolveWatermark` then caps the watermark at the last batch that DID land. The next cycle re-selects the
 * same batch and fails identically — **the edges channel to that peer stops making progress permanently**,
 * which is precisely the wedge the pull fix was written to remove.
 *
 * ## Only duplicates, deliberately
 *
 * Any other write fault still throws. Swallowing those would hide genuine corruption, which is the opposite
 * defect and the harder one to find later — the same reasoning the pull side records.
 *
 * Both shapes, because both reach here: a single `replaceOne` rejects with `code: 11000` directly, while a
 * `bulkWrite` collects them into `writeErrors` and the top-level error carries no code at all. A predicate
 * that knew only one of the two would return false for the other and re-throw the very thing it exists to
 * absorb.
 */
export function isDuplicateKeyOnly(err: unknown): boolean {
  const e = err as { code?: number; writeErrors?: Array<{ code?: number; err?: { code?: number } }> };
  const writeErrors = e?.writeErrors;
  if (Array.isArray(writeErrors) && writeErrors.length > 0) {
    return writeErrors.every(w => (w.code ?? w.err?.code) === 11000);
  }
  return e?.code === 11000;
}

export function withSchemaViolations<T extends Record<string, unknown>>(
  body: T,
  violations: SchemaViolation[],
): T & { schemaViolations?: SchemaViolation[] } {
  return violations.length > 0 ? { ...body, schemaViolations: violations } : body;
}
