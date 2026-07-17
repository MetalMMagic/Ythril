/**
 * Network membership — add, remove, and rotate a member signing key.
 *
 * Split out of the api/networks.ts monolith (A17.5); handlers are unchanged.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { requireAdmin } from '../../auth/middleware.js';
import { globalRateLimit } from '../../rate-limit/middleware.js';
import { getConfig, saveConfig, getSecrets, saveSecrets } from '../../config/loader.js';
import { revokePeerCredentialsIfOrphaned } from '../../auth/tokens.js';
import { concludeRoundIfReady, sendMemberRemovedNotify } from '../../sync/governance.js';
import { buildBraintreeAncestors } from '../../util/braintree.js';
import { makeSignedOwnCast, forceSetMemberSigningKey } from '../../util/signing.js';
import { log } from '../../util/log.js';
import type { NetworkMember, VoteRound } from '../../config/types.js';
import { BCRYPT_ROUNDS, SSRF_SAFE_URL } from './_shared.js';

export const membersRouter = Router();

const AddMemberBody = z.object({
  instanceId: z.string().min(1),
  label: z.string().min(1).max(200),
  url: SSRF_SAFE_URL,
  token: z.string().min(1),   // plaintext peer token — stored as bcrypt hash
  direction: z.enum(['both', 'push', 'pull']).default('both'),
  parentInstanceId: z.string().optional(),
  skipTlsVerify: z.boolean().optional(),
});


// ── PUT /api/networks/:id/members/:instanceId/signing-key ──────────────────
// Break-glass: force-pin a member's governance signing key WITHOUT a rotation
// proof. Use when a peer lost its old private key (so it cannot produce a
// continuity proof) and must re-establish trust. Normal rotations propagate
// automatically via a signed proof over gossip.
const SigningKeyBody = z.object({ signingPublicKey: z.string().min(100).max(4000) });

membersRouter.put('/:id/members/:instanceId/signing-key', globalRateLimit, requireAdmin, (req, res) => {
  const parsed = SigningKeyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }
  const member = net.members.find(m => m.instanceId === req.params['instanceId']);
  if (!member) { res.status(404).json({ error: 'Member not found' }); return; }
  forceSetMemberSigningKey(member, parsed.data.signingPublicKey);
  saveConfig(cfg);
  res.json({ ok: true, instanceId: member.instanceId });
});


// ── POST /api/networks/:id/members — add a peer member ────────────────────

membersRouter.post('/:id/members', globalRateLimit, requireAdmin, async (req, res) => {
  try {
    const parsed = AddMemberBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const cfg = getConfig();
    const net = cfg.networks.find(n => n.id === req.params['id']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

    const { instanceId, label, url, token, direction, parentInstanceId, skipTlsVerify } = parsed.data;

    if (net.members.some(m => m.instanceId === instanceId)) {
      res.status(409).json({ error: 'Member already exists' });
      return;
    }

    const tokenHash = await bcrypt.hash(token, BCRYPT_ROUNDS);

    // Re-fetch config after async bcrypt to avoid clobbering concurrent writes.
    const freshCfg = getConfig();
    const freshNet = freshCfg.networks.find(n => n.id === req.params['id']);
    if (!freshNet) { res.status(404).json({ error: 'Network not found' }); return; }
    if (freshNet.members.some(m => m.instanceId === instanceId)) {
      res.status(409).json({ error: 'Member already exists' });
      return;
    }

    const member: NetworkMember = {
      instanceId,
      label,
      url,
      tokenHash,
      direction,
      parentInstanceId,
      skipTlsVerify,
    };

    if (freshNet.type === 'closed' || freshNet.type === 'democratic') {
      // Open a vote round for the new member
      const round: VoteRound = {
        roundId: uuidv4(),
        type: 'join',
        subjectInstanceId: instanceId,
        subjectLabel: label,
        subjectUrl: url,
        deadline: new Date(Date.now() + freshNet.votingDeadlineHours * 3_600_000).toISOString(),
        openedAt: new Date().toISOString(),
        votes: [],
        pendingMember: member,
      };
      freshNet.pendingRounds.push(round);
      // Save the plaintext peer token so the sync engine can use it once the vote passes
      const secrets = getSecrets();
      secrets.peerTokens[instanceId] = token;
      saveSecrets(secrets);
      saveConfig(freshCfg);
      log.info(`Opened join vote round ${round.roundId} for ${label} in network ${freshNet.id}`);
      res.status(202).json({ status: 'vote_pending', roundId: round.roundId });
      return;
    }

    if (freshNet.type === 'club' || freshNet.type === 'pubsub') {
      // Club / Pubsub: direct add, no vote required.
      // Pubsub never allows 'both' — publisher stores subscribers as 'push',
      // subscriber stores publisher as 'pull'.  If 'both' is provided, default
      // to 'push' (the common publisher-side case); explicit 'pull' is respected
      // so the subscriber can manually add the publisher.
      if (freshNet.type === 'pubsub' && member.direction === 'both') member.direction = 'push';
      freshNet.members.push(member);
      const secrets = getSecrets();
      secrets.peerTokens[instanceId] = token;
      saveSecrets(secrets);
      saveConfig(freshCfg);
      log.info(`Added member ${label} (${instanceId}) to network ${freshNet.id}`);
      const { tokenHash: _th, skipTlsVerify: _sv, ...safeMember } = member;
      res.status(201).json(safeMember);
      return;
    }

    // Braintree: open a vote round with requiredVoters = ancestry path from self to root.
    // The proposer (this instance) auto-votes yes.  If the path is only [self] (root case),
    // concludeRoundIfReady passes immediately and we add the member right away → 201.
    // Otherwise we return 202 and wait for all ancestors to vote via gossip propagation.
    const requiredVoters = buildBraintreeAncestors(freshNet, freshCfg.instanceId, freshCfg.instanceId);
    const round: VoteRound = {
      roundId: uuidv4(),
      type: 'join',
      subjectInstanceId: instanceId,
      subjectLabel: label,
      subjectUrl: url,
      deadline: new Date(Date.now() + freshNet.votingDeadlineHours * 3_600_000).toISOString(),
      openedAt: new Date().toISOString(),
      votes: [],
      pendingMember: member,
      requiredVoters,
    };
    freshNet.pendingRounds.push(round);
    // Auto-cast this instance's yes vote (proposer implicitly approves their own proposal)
    round.votes.push(makeSignedOwnCast(freshNet.id, round, freshCfg.instanceId, 'yes'));
    const secrets = getSecrets();
    secrets.peerTokens[instanceId] = token;
    saveSecrets(secrets);
    const immediatePassed = concludeRoundIfReady(freshNet, round);
    if (immediatePassed) {
      // Root case: only self needed to vote → add member directly
      freshNet.members.push(member);
      saveConfig(freshCfg);
      log.info(`Braintree join immediate (root): added ${label} (${instanceId}) to network ${freshNet.id}`);
      const { tokenHash: _th, skipTlsVerify: _sv, ...safeMember } = member;
      res.status(201).json(safeMember);
      return;
    }
    saveConfig(freshCfg);
    log.info(`Opened braintree join round ${round.roundId} for ${label} (${instanceId}) in network ${freshNet.id}`);
    res.status(202).json({ status: 'vote_pending', roundId: round.roundId });
  } catch (err) {
    log.error(`POST /api/networks/:id/members: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});


// ── DELETE /api/networks/:id/members/:instanceId — remove a member ─────────

membersRouter.delete('/:id/members/:instanceId', globalRateLimit, requireAdmin, (req, res) => {
  const cfg = getConfig();
  const net = cfg.networks.find(n => n.id === req.params['id']);
  if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

  const memberIdx = net.members.findIndex(m => m.instanceId === req.params['instanceId']);
  if (memberIdx < 0) { res.status(404).json({ error: 'Member not found' }); return; }

  if (net.type === 'closed' || net.type === 'democratic') {
    // Open a remove vote round
    const member = net.members[memberIdx]!;
    const round: VoteRound = {
      roundId: uuidv4(),
      type: 'remove',
      subjectInstanceId: member.instanceId,
      subjectLabel: member.label,
      subjectUrl: member.url,
      deadline: new Date(Date.now() + net.votingDeadlineHours * 3_600_000).toISOString(),
      openedAt: new Date().toISOString(),
      votes: [],
    };
    net.pendingRounds.push(round);
    saveConfig(cfg);
    log.info(`Opened remove vote round ${round.roundId} for ${member.label} in network ${net.id}`);
    res.status(202).json({ status: 'vote_pending', roundId: round.roundId });
    return;
  }

  if (net.type === 'club' || net.type === 'pubsub') {
    // Club / Pubsub: publisher (owner) removes directly, no vote required
    const removedId = net.members[memberIdx]!.instanceId;
    net.members.splice(memberIdx, 1);
    saveConfig(cfg);
    revokePeerCredentialsIfOrphaned(removedId)
      .catch(err => log.error(`peer credential revocation for ${removedId}: ${err}`));
    res.status(204).end();
    return;
  }

  // Braintree: open a remove vote round with requiredVoters = ancestor path of the subject.
  // The subject's parent (and all ancestors up to root) must approve the removal.
  const subject = net.members[memberIdx]!;
  // Walk from subject's parent upward; if the subject is a direct child of self,
  // buildBraintreeAncestors(startId=self) correctly includes self and self's own ancestors.
  const subjectParentId = subject.parentInstanceId ?? cfg.instanceId;
  const requiredVoters = buildBraintreeAncestors(net, cfg.instanceId, subjectParentId);
  const removeRound: VoteRound = {
    roundId: uuidv4(),
    type: 'remove',
    subjectInstanceId: subject.instanceId,
    subjectLabel: subject.label,
    subjectUrl: subject.url,
    deadline: new Date(Date.now() + net.votingDeadlineHours * 3_600_000).toISOString(),
    openedAt: new Date().toISOString(),
    votes: [],
    requiredVoters,
  };
  net.pendingRounds.push(removeRound);
  // Auto-cast this instance's yes vote if we are a required voter
  if (requiredVoters.includes(cfg.instanceId)) {
    removeRound.votes.push(makeSignedOwnCast(net.id, removeRound, cfg.instanceId, 'yes'));
  }
  const immediatePassed = concludeRoundIfReady(net, removeRound);
  if (immediatePassed) {
    // Ancestor path is only [self] → remove immediately (member already spliced by concludeRoundIfReady)
    saveConfig(cfg);
    sendMemberRemovedNotify(removeRound.subjectUrl, removeRound.subjectInstanceId, net.id);
    log.info(`Braintree remove immediate: removed ${subject.label} (${subject.instanceId}) from network ${net.id}`);
    res.status(204).end();
    return;
  }
  saveConfig(cfg);
  log.info(`Opened braintree remove round ${removeRound.roundId} for ${subject.label} (${subject.instanceId}) in network ${net.id}`);
  res.status(202).json({ status: 'vote_pending', roundId: removeRound.roundId });
});
