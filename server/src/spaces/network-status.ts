import type { NetworkConfig } from '../config/types.js';

export interface SpaceNetworkInfo {
  networks: { id: string; label: string; type: NetworkConfig['type'] }[];
  networkStatus: 'vote' | 'degraded' | 'syncing' | 'idle';
}

/** Consecutive failed sync cycles before a peer reads as "degraded" rather than a
 *  transient blip that the next cycle recovers. Keeps the red indicator meaningful
 *  ("investigate") instead of firing on every retried hiccup. */
export const DEGRADE_THRESHOLD = 3;

/**
 * Aggregate a space's network membership plus a single status for the Brain
 * space-chip indicator (F8).
 *
 * Membership lives on the network side (`network.spaces`), so this reverse-looks-up
 * across all networks the space belongs to. Status priority is
 *   vote > degraded > syncing > idle
 * ordered so a persistent failure ("investigate") is not masked by the doomed retry
 * that happens to be in flight. There is no true "fully synced" signal (sync is
 * eventual), so an idle-and-healthy member is simply `idle` (the chip shows a muted,
 * uncoloured icon).
 *
 * Returns `undefined` when the space is in no network — the chip then shows no
 * indicator at all.
 *
 * `isSyncing(networkId)` is injected (rather than imported) so this stays a pure,
 * unit-testable function; the route passes the sync engine's in-flight check.
 */
export function spaceNetworkInfo(
  networks: NetworkConfig[],
  spaceId: string,
  isSyncing: (networkId: string) => boolean,
): SpaceNetworkInfo | undefined {
  const nets = networks.filter(n => n.spaces.includes(spaceId));
  if (nets.length === 0) return undefined;

  // A network-wide round (no spaceId — join/remove) affects every member space;
  // a space-scoped round (space_deletion/meta_change) only its own space.
  const hasOpenVote = nets.some(n =>
    n.pendingRounds.some(r => !r.concluded && (!r.spaceId || r.spaceId === spaceId)));
  const degraded = nets.some(n =>
    n.members.some(m => (m.consecutiveFailures ?? 0) >= DEGRADE_THRESHOLD));
  const syncing = nets.some(n => isSyncing(n.id));

  const networkStatus = hasOpenVote ? 'vote' : degraded ? 'degraded' : syncing ? 'syncing' : 'idle';
  return {
    networks: nets.map(n => ({ id: n.id, label: n.label, type: n.type })),
    networkStatus,
  };
}
