/**
 * Network topology — reparent-self, adopt a member, revert a member's parent.
 *
 * Split out of the api/networks.ts monolith (A17.5); handlers are unchanged.
 */
import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../auth/middleware.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { getConfig, saveConfig, getSecrets, saveSecrets } from '../../config/loader.js';
import { log } from '../../util/log.js';
import { SSRF_SAFE_URL } from './_shared.js';

export const topologyRouter = Router();

const ReparentSelfBody = z.object({
  /** instanceId of the new parent (e.g. grandparent) */
  newParentInstanceId: z.string().uuid(),
  newParentLabel: z.string().min(1).max(200),
  newParentUrl: SSRF_SAFE_URL,
  /** Plaintext token (decrypted from the invite apply response) to call the new parent */
  tokenForNewParent: z.string().min(1),
  /** instanceId of the original parent that is offline */
  originalParentInstanceId: z.string().uuid(),
});


// ── POST /api/networks/:id/reparent-self ────────────────────────────────────
// Called by a node on ITSELF after completing the invite apply step.
// Records the new parent in the local config so this node knows it is
// temporarily connected to a grandparent rather than its original parent.

topologyRouter.post('/:id/reparent-self', globalRateLimit, requireAdmin, async (req, res) => {
  try {
    const parsed = ReparentSelfBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const cfg = getConfig();
    const net = cfg.networks.find(n => n.id === req.params['id']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }
    if (net.type !== 'braintree') { res.status(400).json({ error: 'reparent-self is only valid for braintree networks' }); return; }

    const { newParentInstanceId, newParentLabel, newParentUrl, tokenForNewParent, originalParentInstanceId } = parsed.data;

    // Upsert the new parent in the local member list so the engine can report status
    const existing = net.members.find(m => m.instanceId === newParentInstanceId);
    if (!existing) {
      net.members.push({
        instanceId: newParentInstanceId,
        label: newParentLabel,
        url: newParentUrl,
        tokenHash: '',   // no inbound auth needed on this side — new parent pushes TO us
        direction: 'push',
      });
    }

    // Store the outbound token so this engine can call the new parent if needed
    const secrets = getSecrets();
    secrets.peerTokens[newParentInstanceId] = tokenForNewParent;
    saveSecrets(secrets);

    // Mark the temporary reparent state
    net.temporaryReparent = {
      newParentInstanceId,
      originalParentInstanceId,
      reparentedAt: new Date().toISOString(),
    };

    saveConfig(cfg);
    log.info(`reparent-self: network ${net.id} — new parent ${newParentInstanceId} (was ${originalParentInstanceId})`);
    res.json({ status: 'reparented', newParentInstanceId, originalParentInstanceId });
  } catch (err) {
    log.error(`POST /api/networks reparent-self: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// ── POST /api/networks/:id/members/:instanceId/adopt ───────────────────────
// Called on the GRANDPARENT side. Makes a temporary reparent permanent by clearing
// originalParentInstanceId from the grandchild's member record.

topologyRouter.post('/:id/members/:instanceId/adopt', globalRateLimit, requireAdmin, (req, res) => {
  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

  const member = net.members.find(m => m.instanceId === req.params['instanceId']);
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
  if (!member.originalParentInstanceId) {
    res.status(409).json({ error: 'Member is not in a temporary reparent state' });
    return;
  }

  const oldOriginal = member.originalParentInstanceId;
  delete member.originalParentInstanceId;
  saveConfig(cfg);

  log.info(`Permanent adoption: '${member.label}' (${member.instanceId}) adopted from ${oldOriginal} in network ${net.id}`);
  res.json({ status: 'adopted', instanceId: member.instanceId, parentInstanceId: member.parentInstanceId });
});


// ── POST /api/networks/:id/members/:instanceId/revert-parent ───────────────
// Called on the GRANDPARENT side when the original parent is back online.
// Restores the topology: grandchild re-parents to its original parent.

topologyRouter.post('/:id/members/:instanceId/revert-parent', globalRateLimit, requireAdmin, (req, res) => {
  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

  const member = net.members.find(m => m.instanceId === req.params['instanceId']);
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
  if (!member.originalParentInstanceId) {
    res.status(409).json({ error: 'Member is not in a temporary reparent state' });
    return;
  }

  // Restore original parent
  const restoredParentId = member.originalParentInstanceId;
  member.parentInstanceId = restoredParentId;
  delete member.originalParentInstanceId;

  // Move member from this instance's children back to original parent's children
  const selfInNet = net.members.find(m => m.instanceId === cfg.instanceId);
  if (selfInNet?.children) {
    selfInNet.children = selfInNet.children.filter(c => c !== member.instanceId);
  }
  const originalParent = net.members.find(m => m.instanceId === restoredParentId);
  if (originalParent?.children && !originalParent.children.includes(member.instanceId)) {
    originalParent.children.push(member.instanceId);
  }

  // Remove direct outbound token — grandparent no longer pushes directly
  const secrets = getSecrets();
  delete secrets.peerTokens[member.instanceId];
  saveSecrets(secrets);

  saveConfig(cfg);
  log.info(`Parent reverted: '${member.label}' (${member.instanceId}) re-parented back to ${restoredParentId} in network ${net.id}`);
  res.json({ status: 'reverted', instanceId: member.instanceId, parentInstanceId: restoredParentId });
});
