/**
 * Standalone unit tests for the Brain space-chip network indicator (F8).
 *
 * Exercises the REAL compiled logic — `spaceNetworkInfo` from
 * server/src/spaces/network-status.ts (imported from dist, built in CI before the
 * standalone suite runs) — so it cannot drift from the route that uses it.
 *
 * The rules under test:
 *   - a space in no network → undefined (chip shows no indicator)
 *   - status priority: vote > degraded > syncing > idle
 *   - degraded only when a peer has failed >= DEGRADE_THRESHOLD consecutive cycles
 *     (a single retried blip must NOT read as degraded)
 *   - network-wide rounds (no spaceId) affect every member space; space-scoped
 *     rounds (space_deletion/meta_change) only their own space
 *
 * Run: node --test testing/standalone/space-network-status.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spaceNetworkInfo, DEGRADE_THRESHOLD } from '../../server/dist/spaces/network-status.js';

/** Build a minimal NetworkConfig-shaped object for the fields the function reads. */
function net(overrides = {}) {
  return {
    id: 'n1', label: 'Braintree', type: 'braintree',
    spaces: ['work'], members: [], pendingRounds: [],
    ...overrides,
  };
}
const member = (consecutiveFailures = 0) => ({ instanceId: 'peer', label: 'Peer', consecutiveFailures });
const round = (extra = {}) => ({ roundId: 'r1', concluded: false, ...extra });
const neverSyncing = () => false;
const alwaysSyncing = () => true;

describe('spaceNetworkInfo (F8 space-chip status)', () => {
  it('returns undefined for a space in no network', () => {
    assert.equal(spaceNetworkInfo([net({ spaces: ['other'] })], 'work', neverSyncing), undefined);
    assert.equal(spaceNetworkInfo([], 'work', neverSyncing), undefined);
  });

  it('idle: member of a network with nothing happening', () => {
    const info = spaceNetworkInfo([net()], 'work', neverSyncing);
    assert.deepEqual(info.networks, [{ id: 'n1', label: 'Braintree', type: 'braintree' }]);
    assert.equal(info.networkStatus, 'idle');
  });

  it('syncing: a cycle is in flight for the space network', () => {
    assert.equal(spaceNetworkInfo([net()], 'work', alwaysSyncing).networkStatus, 'syncing');
  });

  it('degraded only at/above the consecutive-failure threshold (not a single blip)', () => {
    const below = net({ members: [member(DEGRADE_THRESHOLD - 1)] });
    assert.equal(spaceNetworkInfo([below], 'work', neverSyncing).networkStatus, 'idle',
      'a couple of retried failures must not read as degraded');
    const at = net({ members: [member(DEGRADE_THRESHOLD)] });
    assert.equal(spaceNetworkInfo([at], 'work', neverSyncing).networkStatus, 'degraded');
  });

  it('vote: an open round on the network', () => {
    const withVote = net({ pendingRounds: [round()] });
    assert.equal(spaceNetworkInfo([withVote], 'work', neverSyncing).networkStatus, 'vote');
  });

  it('ignores concluded rounds', () => {
    const concluded = net({ pendingRounds: [round({ concluded: true })] });
    assert.equal(spaceNetworkInfo([concluded], 'work', neverSyncing).networkStatus, 'idle');
  });

  it('a space-scoped round only affects its own space', () => {
    const other = net({ pendingRounds: [round({ spaceId: 'other' })] });
    assert.equal(spaceNetworkInfo([other], 'work', neverSyncing).networkStatus, 'idle',
      "a space_deletion/meta_change round for another space must not blue this one");
    const mine = net({ pendingRounds: [round({ spaceId: 'work' })] });
    assert.equal(spaceNetworkInfo([mine], 'work', neverSyncing).networkStatus, 'vote');
  });

  it('a network-wide round (no spaceId) affects every member space', () => {
    const wide = net({ spaces: ['work', 'other'], pendingRounds: [round()] });
    assert.equal(spaceNetworkInfo([wide], 'work', neverSyncing).networkStatus, 'vote');
    assert.equal(spaceNetworkInfo([wide], 'other', neverSyncing).networkStatus, 'vote');
  });

  it('priority: vote > degraded > syncing > idle', () => {
    // All three conditions true at once → vote wins.
    const all = net({ members: [member(DEGRADE_THRESHOLD)], pendingRounds: [round()] });
    assert.equal(spaceNetworkInfo([all], 'work', alwaysSyncing).networkStatus, 'vote');
    // Degraded + syncing, no vote → degraded wins (a persistent failure isn't masked
    // by the doomed retry in flight).
    const degSync = net({ members: [member(DEGRADE_THRESHOLD)] });
    assert.equal(spaceNetworkInfo([degSync], 'work', alwaysSyncing).networkStatus, 'degraded');
  });

  it('aggregates across multiple networks the space belongs to', () => {
    const a = net({ id: 'a', label: 'A', spaces: ['work'] });
    const b = net({ id: 'b', label: 'B', spaces: ['work'], pendingRounds: [round()] });
    const info = spaceNetworkInfo([a, b], 'work', neverSyncing);
    assert.equal(info.networks.length, 2);
    assert.equal(info.networkStatus, 'vote', 'an open round on any of the space networks counts');
  });
});
