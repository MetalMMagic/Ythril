/**
 * The peer version floor — what another instance must be running to stay on the network.
 *
 * Owner's ruling on `P-33`, 2026-09-04: **B, and explicitly not A.** A would have kept the legacy
 * `excludeFromVectorSearch` spelling at 4.0 purely so that an old peer could not strip a record's
 * suppression mark. B removes the need for it: declare a floor, enforce it, and the legacy key has
 * nothing left to guard against.
 *
 * ## Two floors, and this is the one nobody had
 *
 * `_DEPRECATIONS.md` was treating them as one and the arithmetic came out wrong because of it:
 *
 * - the **upgrade floor** — what version an instance must be at to run the 4.0 migrations. Derived from
 *   when those migrations shipped, and unrelated to peers.
 * - the **peer floor** — what version another instance may be running while remaining compatible. This
 *   one. Nothing derived it, and nothing could express it: there was no `minPeerVersion` in the
 *   codebase, no version on `NetworkMember`, and no sync path that read the version `/health` reports.
 *
 * ## Why 3.1.0 rather than 4.0.0
 *
 * The smallest floor that does the job the ruling asked for. 3.1.0 is the release that started writing
 * `suppressEmbeddings`, so at this floor no peer on the network can be one that strips it — which is
 * exactly what row 1.8 needs and nothing more.
 *
 * A 4.0.0 floor would also have worked and it would have been worse: it forces a whole network to
 * upgrade in lockstep, because the moment one instance reaches 4.0 every 3.x peer stops syncing. A
 * rolling upgrade is the normal way an operator moves a network, and a floor that forbids it turns a
 * routine upgrade into an outage window.
 *
 * **Raising it is one edit here.** That is the point of declaring it in one place, and
 * `a-peer-below-the-floor-is-refused.test.js` holds the "one place" half by refusing a second version
 * literal in any of the three call sites.
 *
 * ## Absent is BELOW the floor, not exempt from it
 *
 * A peer that reports no version is older than the release that started reporting one. That reading is
 * the whole mechanism: taken the other way — absent means "unknown, so allow" — every peer this floor
 * exists to refuse walks straight through, and nothing reports it. `CLAUDE.md` names this shape as the
 * defect class this repo produces most, and it has shipped as an empty allowlist read as "unrestricted"
 * three times already.
 *
 * The same goes for a version that will not parse. An unparseable claim is not evidence of being
 * current; it is a peer we cannot reason about, which is the situation the floor exists for.
 */

import { getConfig } from '../config/loader.js';

/** The minimum version a peer may run. Raising the floor is this line and nothing else. */
export const MIN_PEER_VERSION = '3.1.0';

/**
 * Compare two version strings numerically. Negative if `a` is older, positive if newer, 0 if equal.
 *
 * **Numerically, because a string comparison is a defect with a date on it.** `'10.0.0' < '9.0.0'` is
 * true for strings, so a lexicographic floor starts refusing the NEWEST peers the moment any component
 * reaches double digits — and it refuses them for being too new, which is the opposite of what the
 * message would say.
 *
 * A prerelease suffix is ignored rather than rejected: our own tags are plain, but a peer built from
 * source reports something like `4.0.0-rc.1`, and refusing that as unparseable would lock a tester out
 * of their own network for running the build they were asked to test.
 */
export function comparePeerVersions(a: string, b: string): number {
  const parts = (v: string): number[] => {
    const core = v.trim().split(/[-+]/)[0] ?? '';
    return core.split('.').map(n => Number.parseInt(n, 10));
  };
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** A version string we can actually reason about: three numeric components, suffix allowed. */
function parseable(v: string): boolean {
  const core = v.trim().split(/[-+]/)[0] ?? '';
  const parts = core.split('.');
  return parts.length === 3 && parts.every(p => /^\d+$/.test(p));
}

/**
 * `null` if this peer may sync, otherwise the refusal to send back.
 *
 * **The message names both numbers on purpose.** The instance being refused is the one that has to be
 * upgraded, and its operator reads our refusal in their own log — so a message saying only "too old"
 * makes them come and ask. Naming what they run and what is required makes the refusal actionable
 * without a second conversation.
 */
export function peerFloorRefusal(version: string | null | undefined): string | null {
  const reported = typeof version === 'string' ? version.trim() : '';
  if (!reported) {
    return `Peer reports no version, so it predates ${MIN_PEER_VERSION} — the minimum this network `
      + `requires. Upgrade the peer to ${MIN_PEER_VERSION} or later.`;
  }
  if (!parseable(reported)) {
    return `Peer reports version '${reported}', which is not a version this instance can compare `
      + `against the required minimum of ${MIN_PEER_VERSION}.`;
  }
  if (comparePeerVersions(reported, MIN_PEER_VERSION) < 0) {
    return `Peer runs ${reported}, below the minimum of ${MIN_PEER_VERSION} this network requires. `
      + `Upgrade the peer to ${MIN_PEER_VERSION} or later.`;
  }
  return null;
}

/**
 * Throw unless this member is at or above the floor. The outbound half of the enforcement.
 *
 * **Lives here rather than in the engine, and not only to keep that file from growing.** The inbound
 * middleware and this are the two halves of one rule, and one rule with two implementations is the
 * defect `CLAUDE.md` says this repo produces most. Both now sit in the module that owns the floor.
 *
 * **The version is re-read from config, not taken from the caller.** The engine holds a `member` it
 * captured before the gossip exchange, so by the time this runs that copy is a cycle stale — an
 * upgraded peer would be refused for a version it no longer runs. `reported` is the fallback for the
 * case where the network or member has since gone.
 *
 * **Throwing rather than returning a verdict** is deliberate: the cycle counts an error and surfaces
 * the reason, and a cycle reporting success while a member is silently excluded sends an operator
 * looking at the network instead of at the version.
 */
export function assertPeerAtFloor(networkId: string, instanceId: string, reported?: string): void {
  const current = getConfig().networks
    .find(n => n.id === networkId)?.members
    .find(m => m.instanceId === instanceId)?.version ?? reported;
  const refusal = peerFloorRefusal(current);
  if (refusal) throw new Error(refusal);
}
