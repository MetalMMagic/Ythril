/**
 * Network CRUD + sync trigger/history (`GET /`, `GET|PATCH|DELETE /:id`, `POST /`, `POST /:id/sync`, `GET /:id/sync-history`).
 *
 * Split out of the api/networks.ts monolith (A17.5); handlers are unchanged.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAdmin } from '../../auth/middleware.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { getConfig, saveConfig, getSecrets } from '../../config/loader.js';
import { revokePeerCredentialsIfOrphaned } from '../../auth/tokens.js';
import { getSyncHistory } from '../../sync/history.js';
import { peerSafeFetch } from '../../sync/peer-fetch.js';
import { log } from '../../util/log.js';
import type { NetworkConfig } from '../../config/types.js';

export const crudRouter = Router();

const CreateNetworkBody = z.object({
  id: z.string().uuid().optional(),  // optional pre-specified ID for cross-instance registration
  label: z.string().min(1).max(200),
  type: z.enum(['closed', 'democratic', 'club', 'braintree', 'pubsub']),
  spaces: z.array(z.string().min(1)).min(1),
  votingDeadlineHours: z.number().int().min(1).max(72).default(24),
  syncSchedule: z.string().optional(),
  merkle: z.boolean().optional(),
  requireSignedVotes: z.boolean().optional(),  // strict mode: reject unsigned governance votes
  myParentInstanceId: z.string().optional(),  // braintree: this instance's parent in the tree (omit → root)
});

const UpdateNetworkBody = z.object({
  syncSchedule: z.string().optional(),
  label: z.string().min(1).max(200).optional(),
  requireSignedVotes: z.boolean().optional(),
});

// ── GET /api/networks ──────────────────────────────────

crudRouter.get('/', globalRateLimit, requireAdmin, (_req, res) => {
  const cfg = getConfig();
  // Strip sensitive fields
  const networks = cfg.networks.map(n => ({
    ...n,
    members: n.members.map(({ tokenHash: _th, skipTlsVerify: _sv, ...m }) => m),
    inviteKeyHash: undefined,
  }));
  res.json({ networks });
});


// ── GET /api/networks/:id ──────────────────────────────────────────────────

crudRouter.get('/:id', globalRateLimit, requireAdmin, (req, res) => {
  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

  const safe = {
    ...net,
    members: net.members.map(({ tokenHash: _th, skipTlsVerify: _sv, ...m }) => m),
    inviteKeyHash: undefined,
  };
  res.json(safe);
});


// ── GET /api/networks/:id/sync-history ─────────────────────────────────────

crudRouter.get('/:id/sync-history', globalRateLimit, requireAdmin, async (req, res) => {
  try {
    const cfg = getConfig();
    const net = cfg.networks.find(n => n.id === req.params['id']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

    const limit = Math.min(parseInt(req.query['limit'] as string, 10) || 20, 100);
    const history = await getSyncHistory(net.id, limit);
    res.json({ history });
  } catch (err) {
    log.error(`GET /api/networks/:id/sync-history: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// ── POST /api/networks/:id/sync — manually trigger a sync run ──────────────

crudRouter.post('/:id/sync', globalRateLimit, requireAdmin, (req, res) => {
  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

  import('../../sync/engine.js').then(({ runSyncForNetwork }) => {
    void runSyncForNetwork(net!.id);
  }).catch(err => log.error(`POST /api/networks/:id/sync import: ${err}`));

  res.json({ ok: true });
});


crudRouter.post('/', globalRateLimit, requireAdmin, async (req, res) => {
  try {
    const parsed = CreateNetworkBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const { id: presetId, label, type, spaces, votingDeadlineHours, syncSchedule, merkle, requireSignedVotes, myParentInstanceId } = parsed.data;
    const cfg = getConfig();

    // Validate spaces exist
    const unknownSpaces = spaces.filter(s => !cfg.spaces.some(cs => cs.id === s));
    if (unknownSpaces.length > 0) {
      res.status(400).json({ error: `Unknown spaces: ${unknownSpaces.join(', ')}` });
      return;
    }

    // If a preset ID is given, ensure it is not already in use
    if (presetId && cfg.networks.some(n => n.id === presetId)) {
      res.status(409).json({ error: 'Network with this ID already exists' });
      return;
    }

    const network: NetworkConfig = {
      id: presetId ?? uuidv4(),
      label,
      type,
      spaces,
      votingDeadlineHours,
      syncSchedule,
      merkle,
      ...(requireSignedVotes ? { requireSignedVotes: true } : {}),
      myParentInstanceId: type === 'braintree' ? myParentInstanceId : undefined,
      members: [],
      pendingRounds: [],
      createdAt: new Date().toISOString(),
    };

    cfg.networks.push(network);
    saveConfig(cfg);

    log.info(`Created network '${label}' (${type}) id=${network.id}`);
    const { inviteKeyHash: _ikH, ...safe } = network;
    res.status(201).json(safe);
  } catch (err) {
    log.error(`POST /api/networks: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// ── DELETE /api/networks/:id — leave/delete a network ─────────────────────

crudRouter.delete('/:id', globalRateLimit, requireAdmin, async (req, res) => {
  const cfg = getConfig();
  const idx = cfg.networks.findIndex(n => n.id === req.params['id']);
  if (idx < 0) { res.status(404).json({ error: 'Network not found' }); return; }

  const net = cfg.networks[idx]!;

  // Broadcast member_departed to all peers before removing the network locally.
  const secrets = getSecrets();
  const warnings: string[] = [];
  await Promise.all(net.members.map(async (member) => {
    const peerToken = secrets.peerTokens[member.instanceId];
    if (!peerToken) return;
    try {
      const r = await peerSafeFetch(`${member.url}/api/notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${peerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ networkId: net.id, instanceId: cfg.instanceId, event: 'member_departed' }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!r.ok) warnings.push(`${member.label}: HTTP ${r.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`member_departed to ${member.label}: ${msg}`);
      warnings.push(`${member.label}: ${msg}`);
    }
  }));

  // Re-fetch config after async peer notifications to avoid clobbering concurrent writes.
  {
    const c = getConfig();
    const i = c.networks.findIndex(n => n.id === req.params['id']);
    if (i >= 0) { c.networks.splice(i, 1); saveConfig(c); }
  }
  log.info(`Deleted network id=${net.id}`);

  // Revoke credentials of peers that no longer share any network with us.
  for (const member of net.members) {
    if (member.instanceId === cfg.instanceId) continue;
    await revokePeerCredentialsIfOrphaned(member.instanceId)
      .catch(err => log.error(`peer credential revocation for ${member.instanceId}: ${err}`));
  }

  if (warnings.length) {
    res.json({ ok: true, warnings });
  } else {
    res.status(204).end();
  }
});


// ── PATCH /api/networks/:id — update mutable network fields ───────────────

crudRouter.patch('/:id', globalRateLimit, requireAdmin, (req, res) => {
  const parsed = UpdateNetworkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

  // Snapshot before mutating. Only the three fields this route can change — the record also holds
  // `inviteKeyHash` and members' `tokenHash`, and handing the whole thing over would rest entirely on
  // the allowlist in audit-changes.ts rather than being obvious here.
  req.auditSnapshots = {
    before: { label: net.label, syncSchedule: net.syncSchedule, requireSignedVotes: net.requireSignedVotes },
    after: {
      label: parsed.data.label ?? net.label,
      syncSchedule: parsed.data.syncSchedule !== undefined ? (parsed.data.syncSchedule || undefined) : net.syncSchedule,
      requireSignedVotes: parsed.data.requireSignedVotes ?? net.requireSignedVotes,
    },
  };

  if (parsed.data.syncSchedule !== undefined) {
    net.syncSchedule = parsed.data.syncSchedule || undefined;
    // Re-register cron timer for this network with the new schedule
    import('../../sync/scheduler.js').then(({ scheduleSyncForNetwork }) => {
      scheduleSyncForNetwork(net!.id, net!.syncSchedule);
    }).catch(err => log.warn(`Failed to reschedule sync for ${net!.id}: ${err}`));
  }
  if (parsed.data.label) net.label = parsed.data.label;
  if (parsed.data.requireSignedVotes !== undefined) net.requireSignedVotes = parsed.data.requireSignedVotes;

  saveConfig(cfg);
  log.info(`Updated network ${net.id}`);
  const { inviteKeyHash: _ikh, ...safe } = net;
  res.json({ ...safe, members: net.members.map(({ tokenHash: _th, skipTlsVerify: _sv, ...m }) => m) });
});
