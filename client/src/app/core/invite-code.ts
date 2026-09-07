/**
 * Read a network invite code — the one-line form of the handshake bundle.
 *
 * The inviting instance produces these (`server/src/api/invite-code.ts`); this side only ever reads one. A
 * code minted in a browser would name a handshake session that exists on no server, so there is no encoder
 * here and a gate asserts there is not.
 *
 * ## Two implementations, one format
 *
 * There is no module the server and the browser both import, so the FORMAT is what must not drift:
 *
 *     ythril1_<base64url of the JSON bundle, unpadded>
 *
 * `an-invite-code-is-one-opaque-string.test.js` compares the prefix literal in both files directly. A drift
 * there would reject every invite the product produces, with a message about a malformed code on the one
 * side and nothing at all on the other.
 *
 * ## It is an encoding, not encryption
 *
 * The code carries the `handshakeId`, which the inviter's apply and finalize endpoints accept as their only
 * credential. Anyone who has the string can complete the join, so the dialog that asks for one says to send
 * it the way you would send a password. What limits it is that the handshake expires after an hour and is
 * consumed on use.
 */

/** The readable half, and the version. The server declares the same literal. */
export const INVITE_CODE_PREFIX = 'ythril1_';

/** What a joiner must have to complete a handshake. */
const REQUIRED = ['handshakeId', 'networkId', 'inviteUrl', 'rsaPublicKeyPem'] as const;

/**
 * The handshake bundle -- what `/api/invite/generate` returns, and what a code decodes to.
 *
 * Declared HERE rather than in `api.types.ts`, beside the codec that reads and writes it: the shape and the
 * format are one decision, and `api.types.ts` is a file the god-file ratchet is holding down.
 */
export interface InviteBundle {
  handshakeId: string;
  networkId: string;
  inviteUrl: string;
  rsaPublicKeyPem: string;
  expiresAt?: string;
  spaces?: string[];
  /** The bundle as one line, when the instance that produced it was new enough to have one. */
  inviteCode?: string;
  [k: string]: unknown;
}

/** True when this looks like an invite code rather than the legacy JSON bundle. */
export function looksLikeInviteCode(text: string): boolean {
  return text.trim().startsWith(INVITE_CODE_PREFIX);
}

/**
 * The bundle, or `null` for anything that is not a well-formed invite code.
 *
 * Whitespace at either end is tolerated — selecting a line picks up spaces and mail clients add them.
 * Every rejection is `null` rather than a throw: the caller is a paste box, and the useful answer is "that
 * is not an invite code", never an error about JSON.
 */
export function decodeInviteCode(code: string): InviteBundle | null {
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  if (!trimmed.startsWith(INVITE_CODE_PREFIX)) return null;

  const payload = trimmed.slice(INVITE_CODE_PREFIX.length);
  // `atob` throws on a bad character in some browsers and silently skips it in others, so the alphabet is
  // checked first — a corrupted paste must fail as "not a code", not as a shorter one that half-parses.
  if (payload.length === 0 || /[^A-Za-z0-9_-]/.test(payload)) return null;

  try {
    // base64url → base64, then bytes → UTF-8. `atob` gives one byte per char, so a multi-byte character in
    // a space name would arrive mangled without the decode step below.
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), c => c.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const bundle = parsed as Record<string, unknown>;
    for (const field of REQUIRED) {
      if (typeof bundle[field] !== 'string' || bundle[field] === '') return null;
    }
    return bundle as unknown as InviteBundle;
  } catch {
    return null;
  }
}

/**
 * What an operator sends: the one-line code when the instance produced one, the JSON otherwise.
 *
 * The fallback is not decoration -- an instance that has not been upgraded answers without a code, and a
 * copy button that silently copied nothing would be the worst of the three outcomes.
 */
export function inviteTextOf(bundle: InviteBundle): string {
  return bundle.inviteCode ?? JSON.stringify(bundle, null, 2);
}
