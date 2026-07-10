/**
 * Instance signing keys and vote-cast signatures.
 *
 * Each brain owns a persistent Ed25519 keypair: the private key lives in
 * secrets.json (never leaves the box), the public key lives in config.json and
 * is published to peers via the member-gossip `self` record (trust-on-first-use
 * pinning — see NetworkMember.signingPublicKey).
 *
 * A vote cast is signed ONCE by the voting instance over a canonical message
 * that binds the network, round, subject, voter and vote value. The signature
 * travels with the cast, so ANY node can verify a cast regardless of which peer
 * relayed it. This is what makes multi-hop vote relay safe: a relayed cast is
 * accepted only if its signature verifies against the voter's pinned key, so a
 * peer can neither forge another member's vote nor tamper with a relayed one.
 *
 * Ed25519 is used (not RSA): tiny keys/signatures, deterministic, no digest
 * configuration, and `crypto.sign(null, …)` / `crypto.verify(null, …)` operate
 * directly on the message.
 */

import crypto from 'node:crypto';
import { getConfig, saveConfig, getSecrets, saveSecrets } from '../config/loader.js';
import { log } from '../util/log.js';
import type { NetworkConfig, NetworkMember, VoteRound, VoteCast } from '../config/types.js';

export interface InstanceKeypair {
  publicKeyPem: string;
  privateKeyPem: string;
}

/** Generate a fresh Ed25519 instance keypair (SPKI/PKCS8 PEM). */
export function generateInstanceKeypair(): InstanceKeypair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

/**
 * Canonical message signed for a vote cast. Binding all five fields prevents a
 * signature from being replayed onto a different network, round, subject, voter
 * or vote value.
 */
export function voteCastMessage(params: {
  networkId: string;
  roundId: string;
  subjectInstanceId: string;
  instanceId: string;
  vote: string;
}): string {
  return [
    'ythril-vote:v1',
    params.networkId,
    params.roundId,
    params.subjectInstanceId,
    params.instanceId,
    params.vote,
  ].join('|');
}

/** Sign a message with an Ed25519 private key PEM; returns base64. Empty on failure. */
export function signMessage(privateKeyPem: string, message: string): string {
  try {
    const key = crypto.createPrivateKey(privateKeyPem);
    return crypto.sign(null, Buffer.from(message, 'utf8'), key).toString('base64');
  } catch (err) {
    log.warn(`signMessage failed: ${err instanceof Error ? err.message : String(err)}`);
    return '';
  }
}

/** Verify a base64 Ed25519 signature over `message` against a public key PEM. */
export function verifyMessage(publicKeyPem: string, message: string, sigB64: string): boolean {
  if (!publicKeyPem || !sigB64) return false;
  try {
    const key = crypto.createPublicKey(publicKeyPem);
    return crypto.verify(null, Buffer.from(message, 'utf8'), key, Buffer.from(sigB64, 'base64'));
  } catch {
    return false;
  }
}

// ── Instance keypair lifecycle ───────────────────────────────────────────────

/**
 * Ensure this instance has a persistent signing keypair. Generates one on first
 * call (private key → secrets.json, public key → config.json) and is a no-op
 * afterwards. Safe to call at startup and after setup. Returns the keypair, or
 * null if config/secrets are not yet available (pre-setup).
 */
export function ensureInstanceKeypair(): InstanceKeypair | null {
  let cfg;
  try {
    cfg = getConfig();
  } catch {
    return null; // config not loaded yet (pre-setup)
  }
  const secrets = getSecrets();

  const havePriv = typeof secrets.signingPrivateKey === 'string' && secrets.signingPrivateKey.length > 0;
  const havePub = typeof cfg.signingPublicKey === 'string' && cfg.signingPublicKey.length > 0;
  if (havePriv && havePub) {
    return { publicKeyPem: cfg.signingPublicKey!, privateKeyPem: secrets.signingPrivateKey! };
  }

  const kp = generateInstanceKeypair();
  secrets.signingPrivateKey = kp.privateKeyPem;
  saveSecrets(secrets);
  cfg.signingPublicKey = kp.publicKeyPem;
  saveConfig(cfg);
  log.info('Generated persistent Ed25519 instance signing keypair.');
  return kp;
}

/** Return this instance's signing keypair, or null if not yet initialised. */
export function getInstanceKeypair(): InstanceKeypair | null {
  let cfg;
  try {
    cfg = getConfig();
  } catch {
    return null;
  }
  const secrets = getSecrets();
  if (!secrets.signingPrivateKey || !cfg.signingPublicKey) return null;
  return { publicKeyPem: cfg.signingPublicKey, privateKeyPem: secrets.signingPrivateKey };
}

/** This instance's own public signing key (PEM), or undefined if not initialised. */
export function getSigningPublicKey(): string | undefined {
  try {
    return getConfig().signingPublicKey;
  } catch {
    return undefined;
  }
}

/**
 * Sign a vote cast for THIS instance. Returns a base64 signature, or '' when no
 * keypair is available (the cast then travels unsigned and is accepted by peers
 * only via the own-cast compatibility path, not by relay).
 */
export function signOwnVoteCast(params: {
  networkId: string;
  roundId: string;
  subjectInstanceId: string;
  instanceId: string;
  vote: string;
}): string {
  const kp = getInstanceKeypair();
  if (!kp) return '';
  return signMessage(kp.privateKeyPem, voteCastMessage(params));
}

// ── Key distribution (trust-on-first-use) ────────────────────────────────────

/**
 * Pin a member's signing public key on first sight (TOFU). Sets it when absent;
 * a later attempt to change it to a DIFFERENT key is refused and logged — this
 * prevents a peer from rotating another member's key to impersonate it. Returns
 * true when the member record was modified.
 */
export function pinMemberSigningKey(member: NetworkMember, incomingKey: string | undefined): boolean {
  if (!incomingKey || typeof incomingKey !== 'string') return false;
  if (!member.signingPublicKey) {
    member.signingPublicKey = incomingKey;
    return true;
  }
  if (member.signingPublicKey !== incomingKey) {
    log.warn(
      `TOFU: refusing to change pinned signing key for member '${member.instanceId}' — ignoring new key`,
    );
  }
  return false;
}

// ── Vote-cast verification & relay acceptance ────────────────────────────────

/** Resolve the pinned signing public key for a voter within a network. */
function voterPublicKey(net: NetworkConfig, voterInstanceId: string): string | undefined {
  let selfId: string | undefined;
  try { selfId = getConfig().instanceId; } catch { selfId = undefined; }
  if (voterInstanceId === selfId) return getSigningPublicKey();
  return net.members.find(m => m.instanceId === voterInstanceId)?.signingPublicKey;
}

/** True if the cast carries a valid signature from its claimed voter. */
export function isVoteCastSignatureValid(net: NetworkConfig, round: VoteRound, cast: VoteCast): boolean {
  if (!cast.sig) return false;
  const pub = voterPublicKey(net, cast.instanceId);
  if (!pub) return false;
  return verifyMessage(pub, voteCastMessage({
    networkId: net.id,
    roundId: round.roundId,
    subjectInstanceId: round.subjectInstanceId,
    instanceId: cast.instanceId,
    vote: cast.vote,
  }), cast.sig);
}

/**
 * Decide whether to accept a vote cast that arrived from `reportingInstanceId`
 * (the authenticated peer that reported it — the sync peer we pulled from, or
 * the caller of the vote-relay endpoint).
 *
 *  - A cast with a valid signature is accepted from ANY reporter — this is what
 *    makes multi-hop relay safe (deep braintree trees).
 *  - In strict mode (`net.requireSignedVotes`), an unsigned or invalid cast is
 *    rejected outright.
 *  - Otherwise (compatibility mode, the default), an unsigned cast is accepted
 *    only when reported directly by its own voter — never relayed on behalf of
 *    another instance. This is the pre-signing forgery guard, preserved so that
 *    signing rolls out without breaking not-yet-upgraded peers.
 */
export function acceptVoteCast(
  net: NetworkConfig,
  round: VoteRound,
  cast: VoteCast,
  reportingInstanceId: string | undefined,
): { accept: boolean; reason?: string } {
  if (isVoteCastSignatureValid(net, round, cast)) return { accept: true };
  if (net.requireSignedVotes) {
    return { accept: false, reason: 'unsigned or invalid signature (network requires signed votes)' };
  }
  if (reportingInstanceId && cast.instanceId === reportingInstanceId) return { accept: true };
  return { accept: false, reason: 'unsigned vote relayed on behalf of another instance' };
}
