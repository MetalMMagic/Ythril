import type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';
import { getConfig } from '../../config/loader.js';

export const list_peersTool: ToolHandler = {
  name: 'list_peers',
  description: 'List all configured peer ythril instances (for Brain Networks).',
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
        'Trigger an immediate sync cycle. ' +
        'If peerId is supplied, syncs only that one peer (across all networks it belongs to). ' +
        'If omitted, runs a full cycle for every network. ' +
        'peerId must be an exact instanceId from the member list — it is never used as a URL.',
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
