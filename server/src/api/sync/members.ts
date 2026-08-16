/**
 * Peer-facing network membership — list members, request to join.
 *
 * Split out of the api/sync.ts monolith (A17.6); handlers are unchanged.
 */
import { Router } from 'express';
import { syncRateLimit } from '../../rate-limit/middleware.js';
import { getConfig, loadConfig, saveConfig } from '../../config/loader.js';
import { requireAuth, denyReadOnly } from '../../auth/middleware.js';
import { log } from '../../util/log.js';
import { isPeerUrlAllowed } from '../../sync/peer-fetch.js';
import { getSigningPublicKey, getSigningKeyRotation, pinMemberSigningKey, type SigningKeyRotation } from '../../util/signing.js';
import type { NetworkMember } from '../../config/types.js';

export const syncMembersRouter = Router();


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GOSSIP — member list & votes
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€ Ejection guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// If this instance has been removed from a network by vote, all sync requests
// for that network return 401 {"error":"ejected"} so peers stop trying to sync.
syncMembersRouter.use('/networks/:networkId', (req, res, next) => {
  const cfg = getConfig();
  if (cfg.ejectedFromNetworks?.includes(req.params['networkId'] ?? '')) {
    res.status(401).json({ error: 'ejected' });
    return;
  }
  next();
});

/**
 * GET /api/sync/networks/:networkId/members
 * Return our current view of this network's member list (excluding sensitive fields).
 */
syncMembersRouter.get('/networks/:networkId/members', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const cfg = getConfig();
    const net = cfg.networks.find(n => n.id === req.params['networkId']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

    const safeMembers = net.members.map(m => {
      const { tokenHash: _th, skipTlsVerify: _sv, ...safe } = m;
      return safe;
    });
    res.json({ members: safeMembers, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});


/**
 * POST /api/sync/networks/:networkId/members
 * Peer announces its own member record or relays records it knows about.
 * Only a member may update its own record (gossip poisoning protection).
 */
syncMembersRouter.post('/networks/:networkId/members', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const cfg = getConfig();
    const net = cfg.networks.find(n => n.id === req.params['networkId']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

    const incoming = req.body as Partial<NetworkMember>;
    if (!incoming?.instanceId || !incoming?.label) {
      res.status(400).json({ error: 'instanceId and label required' });
      return;
    }

    // Gossip poisoning protection: only accept record for the member the caller represents.
    // A token with peerInstanceId may only update its own member record; tokens without
    // peerInstanceId (admin/local) may update any record.
    const callerPeerId = (req.authToken as Record<string, unknown>)?.['peerInstanceId'] as string | undefined;
    if (callerPeerId && callerPeerId !== incoming.instanceId) {
      res.status(403).json({ error: 'Token is not authorized to update this member record' });
      return;
    }

    const existing = net.members.find(m => m.instanceId === incoming.instanceId);
    if (!existing) {
      // Unknown member — relay is informational; don't auto-add
      res.status(200).json({ status: 'unknown_member' });
      return;
    }

    // Only the declared instance may update its own record's URL/label/children/direction
    // We trust the caller if they can authenticate (which syncAuth already verified).
    // For simplicity in Phase 3 we apply without full cryptographic proof.
    const fresh = loadConfig();
    const freshNet = fresh.networks.find(n => n.id === req.params['networkId']);
    if (freshNet) {
      const idx = freshNet.members.findIndex(m => m.instanceId === incoming.instanceId);
      if (idx >= 0) {
        // Re-validate a peer-supplied URL before accepting it — a peer must not be
        // able to move itself onto a blocked/internal address post-admission (SSRF).
        let nextUrl = freshNet.members[idx]!.url;
        if (incoming.url && incoming.url !== nextUrl) {
          if (isPeerUrlAllowed(incoming.url)) nextUrl = incoming.url;
          else log.warn(`Member self-update: rejected unsafe URL from ${incoming.instanceId}: ${incoming.url}`);
        }
        const updated = {
          ...freshNet.members[idx]!,
          label: incoming.label ?? freshNet.members[idx]!.label,
          url: nextUrl,
          children: incoming.children ?? freshNet.members[idx]!.children,
          lastSyncAt: new Date().toISOString(),
        };
        // Trust-on-first-use pin; a change to a different key is accepted only
        // with a valid rotation proof carried on the self-record.
        const incomingRotation = (incoming as { signingKeyRotation?: SigningKeyRotation }).signingKeyRotation;
        pinMemberSigningKey(updated, incoming.signingPublicKey, incomingRotation);
        freshNet.members[idx] = updated;
        saveConfig(fresh);
      }
    }

    // Piggyback our own identity in the response so the caller can update their record for us
    const selfUrl = process.env['INSTANCE_URL'] ?? '';
    const selfRecord: Record<string, unknown> = { instanceId: cfg.instanceId, label: cfg.instanceLabel };
    if (selfUrl) selfRecord['url'] = selfUrl;
    const ownSigningKey = getSigningPublicKey();
    if (ownSigningKey) selfRecord['signingPublicKey'] = ownSigningKey;
    const ownRotation = getSigningKeyRotation();
    if (ownRotation) selfRecord['signingKeyRotation'] = ownRotation;
    res.status(200).json({ status: 'ok', self: selfRecord });
  } catch (err) {
    log.error(`sync POST members: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});
