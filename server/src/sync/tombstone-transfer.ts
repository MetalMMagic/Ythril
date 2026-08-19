/**
 * The tombstone half of a sync cycle — both directions, side by side.
 *
 * ## Why it lives here rather than in `engine.ts`
 *
 * Pull and push each had their own inline block, twenty lines apart in a thousand-line file, and the two halves of
 * one protocol phase never got read together. That cost something specific: the pull's `!resp.ok` branch **did not
 * exist**. A peer answering `503` to a tombstone fetch applied nothing, logged nothing, and the cycle advanced its
 * watermark past the deletions anyway. The push side had a warn for the same case. One phase, two implementations,
 * and the weaker one silently won — which `CLAUDE.md` names as the defect this codebase produces most.
 *
 * ## Both return a `TransferOutcome`, and that is the point
 *
 * Tombstones travel under the SAME `lastSeqReceived` / `lastSeqPushed` as the four document collections. A
 * deletion that did not transfer, followed by a watermark that moved past it, is a deletion that never propagates
 * — the record stays alive on the peer for ever and every later cycle reports success. So each direction reports
 * how far it actually got, and `sync/watermark.ts` limits the shared watermark to it.
 */
import { peerSafeFetch } from './peer-fetch.js';
import { boundedJson } from '../util/bounded-read.js';
import { applyRemoteTombstone, listTombstones } from '../brain/tombstones.js';
import { log } from '../util/log.js';
import type { NetworkMember, TombstoneDoc } from '../config/types.js';
import type { TransferOutcome } from './watermark.js';

/** Tombstones are paged at 500. A hard cap would silently drop deletions after a long absence, so there is none. */
const TOMBSTONE_PAGE = 500;

/**
 * Fetch the peer's tombstones since `sinceSeq` and apply them.
 *
 * Called BEFORE the document pull so deletions land before anything that would re-upsert a deleted doc.
 */
export async function pullTombstones(opts: {
  member: NetworkMember;
  spaceId: string;
  remoteSpaceId: string;
  networkId: string;
  sinceSeq: number;
  requestInit: () => RequestInit;
}): Promise<TransferOutcome> {
  const { member, spaceId, remoteSpaceId, networkId, sinceSeq, requestInit } = opts;
  const outcome: TransferOutcome = { deliveredThrough: sinceSeq, truncated: false };
  try {
    const url = `${member.url}/api/sync/tombstones?spaceId=${encodeURIComponent(remoteSpaceId)}`
      + `&networkId=${encodeURIComponent(networkId)}&sinceSeq=${sinceSeq}`;
    const resp = await peerSafeFetch(url, requestInit());
    if (!resp.ok) {
      // THE BRANCH THAT DID NOT EXIST. Silence here meant the deletions were skipped and the watermark moved
      // past them, so the next cycle asked for tombstones newer than ones it had never seen.
      outcome.truncated = true;
      log.warn(
        `Pull tombstones from ${member.label} returned ${resp.status} — holding the receive watermark for `
        + `space '${spaceId}' at ${sinceSeq} so the deletions are re-requested next cycle.`,
      );
      return outcome;
    }
    const data = await boundedJson<{
      memories?: TombstoneDoc[]; entities?: TombstoneDoc[]; edges?: TombstoneDoc[]; chrono?: TombstoneDoc[];
    }>(resp, 'sync peer');
    const all = [
      ...(data.memories ?? []), ...(data.entities ?? []), ...(data.edges ?? []), ...(data.chrono ?? []),
    ];
    // The peer we pulled from is the authenticated source. Its own tombstones (issuer === member) are
    // authorised; a tombstone it relays on behalf of a third author is refused here and applied instead when we
    // sync directly with that author.
    for (const t of all) { await applyRemoteTombstone(t, { peerInstanceId: member.instanceId }); }
  } catch (err) {
    outcome.truncated = true;
    log.warn(`pullFromPeer tombstones from ${member.label}: ${err}`);
  }
  return outcome;
}

/** Send our tombstones newer than `lastSeqPushed`, paging until the peer has them all. */
export async function pushTombstones(opts: {
  member: NetworkMember;
  spaceId: string;
  remoteSpaceId: string;
  networkId: string;
  lastSeqPushed: number;
  requestInit: () => RequestInit;
}): Promise<TransferOutcome> {
  const { member, spaceId, remoteSpaceId, networkId, lastSeqPushed, requestInit } = opts;
  const outcome: TransferOutcome = { deliveredThrough: lastSeqPushed, truncated: false };
  const endpoint = `${member.url}/api/sync/tombstones?spaceId=${encodeURIComponent(remoteSpaceId)}`
    + `&networkId=${encodeURIComponent(networkId)}`;
  let cursor = lastSeqPushed;
  for (;;) {
    const page = await listTombstones(spaceId, cursor, TOMBSTONE_PAGE);
    if (page.length === 0) break;
    const resp = await peerSafeFetch(endpoint, {
      ...requestInit(), method: 'POST', body: JSON.stringify({ tombstones: page }),
    });
    if (!resp.ok) {
      // Caps the shared watermark. A tombstone page the peer refused, followed by a watermark that advanced past
      // it, is a deletion this instance will never send again.
      outcome.truncated = true;
      log.warn(
        `Push tombstones to ${member.label}: ${resp.status} — delivered through seq ${cursor}, so the push `
        + `watermark for space '${spaceId}' is held there.`,
      );
      break;
    }
    cursor = page[page.length - 1]!.seq;
    outcome.deliveredThrough = cursor;
    if (page.length < TOMBSTONE_PAGE) break;
  }
  return outcome;
}
