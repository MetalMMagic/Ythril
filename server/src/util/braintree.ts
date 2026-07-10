/**
 * Braintree topology helper.
 *
 * Extracted into a shared, dependency-free module so both the network
 * governance API (round creation) and the sync engine (round conclusion) can
 * compute the ancestor voter set from the SAME source of truth. Conclusion must
 * recompute this locally rather than trust a peer-supplied `requiredVoters`,
 * which is attacker-controllable once a round is adopted via gossip.
 */

import type { NetworkConfig } from '../config/types.js';

/**
 * Compute the list of instance IDs that must vote yes for a Braintree governance
 * action.
 *
 * Walks from `startId` upward through `parentInstanceId` on network members.
 * When the walk reaches `selfId` it continues via `net.myParentInstanceId` (the
 * recorded parent of this instance). Returns the path from `startId` up to (and
 * including) the root.
 *
 * For a JOIN round: startId = the inviting node (the pending member's parent).
 * For a REMOVE round: startId = the subject's direct parent.
 */
export function buildBraintreeAncestors(
  net: NetworkConfig,
  selfId: string,
  startId: string,
): string[] {
  const path: string[] = [];
  const visited = new Set<string>();
  let cur: string | undefined = startId;
  while (cur && !visited.has(cur)) {
    path.push(cur);
    visited.add(cur);
    if (cur === selfId) {
      cur = net.myParentInstanceId; // continue upward via this instance's declared parent
    } else {
      const m = net.members.find(m => m.instanceId === cur);
      if (!m) break; // chain incomplete; stop here
      cur = m.parentInstanceId;
    }
  }
  return path;
}
