import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { getConfig } from '../../config/loader.js';

export const list_peersTool: ToolHandler = {
  name: 'list_peers',
  description: 'List every peer instance this brain is connected to, flattened across all of its networks. '
    + 'Requires instance-admin rights. Read-only — it configures nothing and triggers nothing.\n\n'
    + 'ONE PEER APPEARS ONCE PER NETWORK IT BELONGS TO, not once overall. The same instance in two networks '
    + 'gives two rows with the same `instanceId` and different `network`/`networkId`. Deduplicate on '
    + '`instanceId` if you want distinct machines; keep the rows as they are if you care about which network a '
    + 'link belongs to, because the direction and the sync state are per network.\n\n'
    + 'IT IS THE SOURCE OF THE `instanceId` VALUES the sync-triggering tool wants — that one takes an exact '
    + 'instanceId and never a URL or a label, so copy it from here rather than typing it.\n\n'
    + 'NO CREDENTIALS ARE EVER RETURNED. Token hashes and invite-key hashes are stripped before the reply is '
    + 'built; there is no parameter that includes them and no other surface that exposes them.\n\n'
    + 'RESPONSE, per row: `instanceId` and `label` (who), `url` (where), `direction` (whether this link '
    + 'pushes, pulls or both), `network`/`networkId`/`networkType` (which network this row is about), '
    + '`lastSyncAt` (null if this pair has never synced), `consecutiveFailures` (0 when healthy — a climbing '
    + 'number is the signal that a peer is unreachable, and it is the field to check before blaming missing '
    + 'records on anything else), and `skipTlsVerify` (true means certificate checking is off for this peer, '
    + 'which is worth noticing on an audit).\n\n'
    + 'An empty list means this instance is in no network, not that syncing failed.',
  admin: true,
  inputSchema: (_s: ToolSchemas) => ({ type: 'object', properties: {}, required: [], additionalProperties: false }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const listPeersCfg = getConfig();
    // Build a flat list of peers across all networks, scrubbing all
    // credential fields (tokenHash, inviteKeyHash must never be exposed).
    const peers = listPeersCfg.networks.flatMap(net =>
      net.members.map(m => ({
        instanceId: m.instanceId,
        label: m.label,
        url: m.url,
        direction: m.direction,
        network: net.label,
        networkId: net.id,
        networkType: net.type,
        lastSyncAt: m.lastSyncAt ?? null,
        consecutiveFailures: m.consecutiveFailures ?? 0,
        skipTlsVerify: m.skipTlsVerify ?? false,
      })),
    );
    return {
      content: [
        {
          type: 'text' as const,
          text: peers.length === 0
            ? 'No peers configured.'
            : JSON.stringify(peers),
        },
      ],
    };
  },
};

export const sync_nowTool: ToolHandler = {
  name: 'sync_now',
  description:
        'Run a sync cycle now instead of waiting for the schedule. Requires instance-admin rights.\n\n'
        + 'IT DOES NOT WAIT FOR THE DATA. The cycle is started and the reply comes back; records arrive '
        + 'afterwards, and how long that takes depends on how far behind the peers are. So a successful reply '
        + 'means "a cycle was started", never "everything is now in step" — read `list_peers` and its '
        + '`lastSyncAt` / `consecutiveFailures` to see whether it landed.\n\n'
        + 'SYNC IS ALREADY AUTOMATIC. Every network has a schedule, so this is for closing a gap you do not '
        + 'want to wait out: after fixing a peer that was unreachable, or before reading a space you have just '
        + 'been told was changed elsewhere. It is not something to call in a loop — a cycle that overlaps the '
        + 'scheduled one does no more work, it competes with it.\n\n'
        + 'PARAMETERS:\n'
        + '- `peerId` — an EXACT `instanceId` from `list_peers`. Never a URL and never a label. That one peer '
        + 'is synced across every network it belongs to. Omit it to run a full cycle for every network, which '
        + 'is the usual call.\n\n'
        + 'RESPONSE: confirmation that the cycle started, and what it covers. A peer that is unreachable does '
        + 'NOT make this return an error — that surfaces as a climbing `consecutiveFailures` on the peer, so '
        + 'this call succeeding is not evidence any peer answered.',
  mutating: true,
  admin: true,
  inputSchema: (s: ToolSchemas) => ({
          type: 'object',
          properties: {
            peerId: {
              type: 'string',
              description: 'Exact instanceId of the peer to sync (must be a known member instanceId — never a URL). Omit to sync all networks.',
            },
          },
          required: [],
          additionalProperties: false,
        }),
  async handle(ctx: ToolContext): Promise<ToolResult> {
    const { args: a } = ctx;
    const peerId = a['peerId'] != null ? String(a['peerId']).trim() : null;
    const { runSyncForPeer, runSyncForNetwork } = await import('../../sync/engine.js');
    const syncCfg = getConfig();

    if (peerId) {
      // SEC-16: validate peerId is a known instanceId, never use as URL
      const knownIds = new Set(syncCfg.networks.flatMap(n => n.members.map(m => m.instanceId)));
      if (!knownIds.has(peerId)) {
        return {
          content: [{ type: 'text' as const, text: `Error: peerId '${peerId}' is not a registered member in any network.` }],
          isError: true,
        };
      }
      const result = await runSyncForPeer(peerId);
      return {
        content: [{
          type: 'text' as const,
          text: result.notFound
            ? `Peer '${peerId}' not found in any network.`
            : `Sync complete: ${result.networksSynced} network(s) synced, ${result.errors} error(s).`,
        }],
        isError: result.errors > 0,
      };
    } else {
      // Sync all networks
      let totalSynced = 0; let totalErrors = 0;
      const lines: string[] = [];
      for (const net of syncCfg.networks) {
        const r = await runSyncForNetwork(net.id);
        totalSynced += r.synced;
        totalErrors += r.errors;
        lines.push(`${net.label}: ${r.synced} ok, ${r.errors} error(s)`);
      }
      return {
        content: [{
          type: 'text' as const,
          text: lines.length === 0
            ? 'No networks configured.'
            : lines.join('\n') + `\n\nTotal: ${totalSynced} synced, ${totalErrors} error(s).`,
        }],
        isError: totalErrors > 0,
      };
    }
  },
};
