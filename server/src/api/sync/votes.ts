/**
 * Peer-facing governance votes — list rounds, accept a peer's cast.
 *
 * Split out of the api/sync.ts monolith (A17.6); handlers are unchanged.
 */
import { Router } from 'express';
import { syncRateLimit } from '../../rate-limit/middleware.js';
import { getConfig, loadConfig, saveConfig } from '../../config/loader.js';
import { requireAuth, denyReadOnly } from '../../auth/middleware.js';
import { log } from '../../util/log.js';
import { acceptVoteCast } from '../../util/signing.js';
import { concludeRoundIfReady, sendMemberRemovedNotify } from '../../sync/governance.js';

export const syncVotesRouter = Router();


/**
 * GET /api/sync/networks/:networkId/votes
 * Return current open vote rounds for this network.
 */
syncVotesRouter.get('/networks/:networkId/votes', syncRateLimit, requireAuth, async (req, res) => {
  try {
    const cfg = getConfig();
    const net = cfg.networks.find(n => n.id === req.params['networkId']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

    const open = net.pendingRounds
      .filter(r => !r.concluded)
      .map(r => {
        // Strip sensitive key material before sending to a peer instance
        const { inviteKeyHash: _ikh, ...safeRound } = r;
        if (safeRound.pendingMember) {
          const { tokenHash: _th, ...safeMember } = safeRound.pendingMember;
          safeRound.pendingMember = safeMember as typeof safeRound.pendingMember;
        }
        return safeRound;
      });
    res.json({ rounds: open });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});


/**
 * POST /api/sync/networks/:networkId/votes/:roundId
 * Peer submits or relays a vote: { vote: 'yes' | 'veto', instanceId }
 */
syncVotesRouter.post('/networks/:networkId/votes/:roundId', syncRateLimit, requireAuth, denyReadOnly, async (req, res) => {
  try {
    const body = req.body as { vote: string; instanceId: string; sig?: string; castAt?: string };
    if (!body?.vote || !body?.instanceId || !['yes', 'veto'].includes(body.vote)) {
      res.status(400).json({ error: 'vote (yes|veto) and instanceId required' });
      return;
    }

    const cfg = loadConfig();
    const net = cfg.networks.find(n => n.id === req.params['networkId']);
    if (!net) { res.status(404).json({ error: 'Network not found' }); return; }

    const round = net.pendingRounds.find(r => r.roundId === req.params['roundId'] && !r.concluded);
    if (!round) { res.status(404).json({ error: 'Round not found or concluded' }); return; }

    // Vote forgery prevention. A signed cast is accepted from any reporter (its
    // signature proves the voter cast it). An unsigned cast is accepted only from
    // its own voter — a peer token may only relay its own instanceId; admin/local
    // tokens (no peerInstanceId) may relay any unsigned cast (compat).
    const callerPeerId = (req.authToken as Record<string, unknown>)?.['peerInstanceId'] as string | undefined;
    const cast = {
      instanceId: body.instanceId,
      vote: body.vote as 'yes' | 'veto',
      castAt: typeof body.castAt === 'string' ? body.castAt : new Date().toISOString(),
      ...(typeof body.sig === 'string' && body.sig ? { sig: body.sig } : {}),
    };
    const decision = acceptVoteCast(net, round, cast, callerPeerId ?? body.instanceId);
    if (!decision.accept) {
      res.status(403).json({ error: `Vote rejected: ${decision.reason}` });
      return;
    }

    // Deduplicate: replace existing vote from this instance if present
    const existing = round.votes.findIndex(v => v.instanceId === body.instanceId);
    if (existing >= 0) { round.votes[existing] = cast; }
    else { round.votes.push(cast); }

    // Check if the round should auto-conclude
    concludeRoundIfReady(net, round);

    // If a space_deletion round just passed, remove the space on this instance
    if (round.concluded && round.type === 'space_deletion') {
      const vetoCount = round.votes.filter(v => v.vote === 'veto').length;
      if (vetoCount === 0 && round.spaceId) {
        import('../../spaces/spaces.js').then(({ removeSpace }) => {
          removeSpace(round.spaceId!).catch(err => log.error(`space_deletion gossip side-effect: ${err}`));
        }).catch(err => log.error(`space_deletion import: ${err}`));
      }
    }

    // If a remove round just passed, notify the ejected member
    if (round.concluded && round.passed && round.type === 'remove') {
      sendMemberRemovedNotify(round.subjectUrl, round.subjectInstanceId, net.id);
    }

    // If a join round just passed via this vote relay, add the pending member.
    if (round.concluded && round.type === 'join' && round.pendingMember) {
      const alreadyAdded = net.members.some(m => m.instanceId === round.subjectInstanceId);
      // Braintree: only the direct parent in the tree admits (ancestor-voters
      // must not add the joiner to their own lists). Other vote-governed types:
      // only the instance that holds the joiner's credentials admits — gossip-
      // adopted round copies have pendingMember.tokenHash stripped.
      const mayAdmit = net.type === 'braintree'
        ? (!round.pendingMember.parentInstanceId || round.pendingMember.parentInstanceId === cfg.instanceId)
        : Boolean(round.pendingMember.tokenHash);
      const vetoed = round.votes.some(v => v.vote === 'veto');
      if (!alreadyAdded && mayAdmit && !vetoed) {
        net.members.push(round.pendingMember);
        log.info(`Join round ${round.roundId} passed via vote relay — added ${round.subjectLabel} to network ${net.id}`);
      }
    }

    saveConfig(cfg);
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    log.error(`sync POST votes: ${err}`);
    res.status(500).json({ error: 'Internal error' });
  }
});
