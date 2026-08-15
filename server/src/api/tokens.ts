import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, requireAdmin, requireAdminMfa } from '../auth/middleware.js';
import { authRateLimit, globalRateLimit } from '../rate-limit/middleware.js';
import { createToken, listTokens, revokeToken, regenerateToken, renameToken, setTokenRights, setTokenMfa } from '../auth/tokens.js';
import { isMfaEnabled, verifyMfaCode } from '../auth/totp.js';
import { z } from 'zod';
import { SPACE_AREAS, RUNGS, RUNG_IMPLICATIONS } from '../config/rights-shape.js';
import { ROUTE_RIGHTS } from '../auth/space-rights.js';
import { refusalsOutsideEditorScope, editorScopeFor } from '../auth/editor-scope.js';
import { capRights, describeExcess } from '../auth/mint-cap.js';
import { refuseSelfFloorRaise } from '../auth/floor-guard.js';
import { migrateToken } from '../auth/rights-migration.js';

export const tokensRouter = Router();

// GET /api/auth/me — returns the current token's metadata (used by the Angular SPA to verify a PAT)
tokensRouter.get('/me', globalRateLimit, requireAuth, (req, res) => {
  res.json(req.authToken);
});

/**
 * GET /api/tokens/rights-catalog — what each area and rung actually GRANTS.
 *
 * The rights grid is four areas × four rungs of bare words, and nothing told an operator what any cell does.
 * The answer already exists and is authoritative: `ROUTE_RIGHTS` is the table the server ENFORCES against, so
 * it is the only description of a right that cannot be wrong. A list typed into the client would be a second
 * copy of a security control, and the copy that drifts is the one people read.
 *
 * **Authenticated, not admin.** It is capability documentation — every route in it is published in the
 * integration guide — and the caller who most needs it is the non-admin trying to understand the rights they
 * hold. Gating it to admins would withhold the explanation from exactly that person.
 *
 * The table is sent FLAT and the cumulative view is computed by the caller, because rungs contain the ones
 * below: `write` grants every `read` route as well. Sending pre-expanded lists would ship the same route many
 * times and put the containment rule in two places.
 *
 * `scope` is deliberately omitted — how a route learns which space it is about is internal, and a tooltip has
 * no use for it.
 *
 * `implications` is published for the same reason the routes are: `knowledge: write` entails `schema: read`
 * (`RUNG_IMPLICATIONS`), the server enforces it in `effectiveRung`, and a grid that hard-coded the pair would
 * be a second copy of a security rule. With it published, the matrix can hold the schema cell at the implied
 * rung and say why, instead of showing `none` while the server grants read.
 */
tokensRouter.get('/rights-catalog', globalRateLimit, requireAuth, (_req, res) => {
  res.json({
    areas: SPACE_AREAS,
    rungs: RUNGS,
    implications: RUNG_IMPLICATIONS,
    routes: ROUTE_RIGHTS.map(r => ({ area: r.area, method: r.method, route: r.route, needs: r.needs })),
  });
});

/**
 * Fields the SERVER owns on a token record. A client that posts a token it read back — `id`, `hash`,
 * `prefix` — is round-tripping, not attacking, and being told "unknown key" for a field we ourselves emitted
 * would be a worse answer than ignoring it.
 *
 * Same shape as `SERVER_OWNED_META_FIELDS` in `api/spaces.ts`: strip exactly the server-owned set, then let
 * a STRICT schema refuse everything else. The two halves are the point — the strip keeps a round-trip
 * working, and the strictness is what stops `spaceIds` minting an unscoped token in silence.
 *
 * A red-team test (`mass-assignment.test.js`) pins the strip; `credential-bodies-are-strict.test.js` pins
 * the strictness. Neither is sufficient alone, which is exactly how the first attempt at this fix broke: it
 * added `.strict()` and turned the round-trip into a 400.
 */
const SERVER_OWNED_TOKEN_FIELDS = ['id', 'hash', 'prefix'] as const;

function stripServerOwnedToken(body: unknown): unknown {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) return body;
  const copy: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const f of SERVER_OWNED_TOKEN_FIELDS) delete copy[f];
  return copy;
}

/**
 * `.strict()`, and it is the most important word in this file.
 *
 * Zod drops unknown keys by default, so `{ spaceIds: ['qa'] }` minted a token with NO `spaces` field and
 * returned 201. The caller is told the operation succeeded, their own notes say the token is scoped, and it
 * reaches every space on the instance. Nothing in the response, the record or the logs tells the two apart.
 *
 * Reported by an operator on 2026-08-09 who probed four plausible spellings — `allowedSpaces`, `scope`,
 * `spaceIds`, `denySpaces` — and got 201 from every one. They found it by reading the stored token back and
 * noticing four of five probes had no `spaces` at all. Their words: "somebody guessing the field name gets a
 * token that looks scoped, reports success, and is not scoped at all."
 *
 * A permissive body schema is a silent failure anywhere. On the endpoint that mints CREDENTIALS it hands out
 * access nobody intended and reports success while doing it.
 */
const CreateTokenBody = z.object({
  name: z.string().min(1).max(200),
  expiresAt: z.string().datetime().nullish(),
  spaces: z.array(z.string().min(1)).max(1000).optional(),
  admin: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  peerInstanceId: z.string().uuid().optional(),
  schemaLibrary: z.boolean().optional(),
  /**
   * This token's relationship to the second factor: `inherit` (default), `exempt`, or `required`.
   * See `TokenRecord.mfa` for why it is three states.
   */
  mfa: z.enum(['inherit', 'exempt', 'required']).optional(),
  /**
   * The per-space rights matrix for the new token.
   *
   * Mutually exclusive with `spaces` / `admin` / `readOnly` — see the refusal below. Accepting both would
   * put two descriptions of the same thing in one request, and the loser would be silent.
   */
  rights: z.object({
    instanceAdmin: z.boolean(),
    createSpaces: z.boolean(),
    floor: z.record(z.enum(SPACE_AREAS), z.enum(RUNGS)).nullable(),
    perSpace: z.record(z.string(), z.record(z.enum(SPACE_AREAS), z.enum(RUNGS))),
  }).strict().optional(),
}).strict();

/**
 * Granting an MFA exemption always costs a live second factor.
 *
 * `requireAdminMfa` on this route is satisfied by an admin token that is ITSELF exempt — which is correct for
 * ordinary work and catastrophic here: one exemption could mint another, and another, until the instance-wide
 * switch protected nothing. Exemptions must not be able to widen themselves.
 *
 * So when the instance switch is on and the request is trying to create an exempt token, a valid TOTP code is
 * demanded on THIS request regardless of who is asking. An operator who holds the exempt automation token and
 * not the authenticator cannot escalate; the human who set it up can.
 */
function exemptionNeedsLiveCode(req: Request, res: Response, mfa: string | undefined): boolean {
  if (mfa !== 'exempt' || !isMfaEnabled()) return true;
  const code = (req.headers['x-totp-code'] as string | undefined ?? '').trim();
  if (!code || !verifyMfaCode(code)) {
    res.status(403).json({
      error: 'MFA_REQUIRED',
      message: 'Granting an MFA exemption requires a current TOTP code, even from a token that is itself exempt',
    });
    return false;
  }
  return true;
}

// GET /api/tokens — list tokens (hashes excluded) — admin only
tokensRouter.get('/', requireAdmin, (req, res) => {
  // A space-restricted administrator sees only the tokens it could act on.
  //
  // It used to receive every token on the instance — names, prefixes, scopes and rights for spaces it cannot reach.
  // Nothing secret leaks (`listTokens()` omits the hash by its own type), but it is an inventory of the instance's
  // access, and the same token is now refused when it tries to EDIT any of those rows. A list that shows what you
  // cannot touch is an invitation to try.
  //
  // Unrestricted admins are unaffected. A `schemaLibrary` token has no space access, so it is inside every scope.
  //
  // Scope comes from `editorScopeFor`, which reads the RIGHTS MATRIX and falls back to the legacy allowlist.
  // Reading `spaces` directly here meant a token minted with a matrix and no allowlist — every token minted
  // since 2.6 — answered `undefined` and was treated as an unrestricted instance administrator.
  const callerSpaces = editorScopeFor(req.authToken);
  const all = listTokens();
  const visible = callerSpaces
    ? all.filter(t => t.schemaLibrary || (t.spaces?.every(s => callerSpaces.includes(s)) ?? false))
    : all;
  res.json({ tokens: visible });
});

// POST /api/tokens — create a new PAT — admin + MFA
// admin:true may only be set when the calling token is itself admin (enforced by requireAdminMfa above)
tokensRouter.post('/', authRateLimit, requireAdminMfa, async (req, res) => {
  const parsed = CreateTokenBody.safeParse(stripServerOwnedToken(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, expiresAt, spaces, admin, readOnly, peerInstanceId, schemaLibrary, mfa, rights } = parsed.data;

  // One description of access per request. A body carrying both `rights` and a legacy field describes the
  // same thing twice, and whichever lost would do so silently — which is the failure this whole area keeps
  // producing. Refusing costs one call; guessing costs an access nobody chose.
  if (rights && (spaces !== undefined || admin !== undefined || readOnly !== undefined)) {
    res.status(400).json({
      error: 'Specify either `rights` or the legacy `spaces`/`admin`/`readOnly` fields, not both',
    });
    return;
  }

  // A token may never mint above itself. Enforced HERE and not only in the UI: the grid is one API call away
  // from being bypassed, and the API is exactly where a token would be used to widen itself.
  if (rights) {
    // OIDC records carry no `rights` — they are built per request and never pass through the config
    // backfill — so the minter's matrix is derived on the spot from the same legacy fields. Deriving is the
    // same answer, not a weaker one; treating a missing matrix as "unrestricted" would be the widening.
    const held = (req.authToken as { rights?: unknown } | undefined)?.rights;
    const minter = held ?? migrateToken(req.authToken ?? {});
    const excess = capRights(minter as never, rights as never);
    if (excess.length > 0) {
      res.status(403).json({
        error: `A token cannot mint rights it does not hold — ${describeExcess(excess)}`,
      });
      return;
    }
  }
  if (!exemptionNeedsLiveCode(req, res, mfa)) return;
  if (admin && readOnly) {
    res.status(400).json({ error: 'A token cannot be both admin and readOnly' });
    return;
  }
  if (schemaLibrary && (admin || spaces?.length)) {
    res.status(400).json({ error: 'A schemaLibrary token cannot have admin or space access' });
    return;
  }

  // Privilege-escalation guard: a space-restricted creator may only mint tokens confined to a SUBSET of its
  // own spaces. Without this, a token scoped to space A could mint an unrestricted token (no `spaces` = all
  // spaces, `admin: true`) and defeat its own scoping. An unrestricted creator may mint any scope.
  //
  // Scope from `editorScopeFor`, the same source the list filter and the PATCH guard now read. It used to be
  // `req.authToken?.spaces` here, in the list filter, and inside `refusalsOutsideEditorScope` — three reads
  // of a deprecated field, and the comment on the PATCH guard already claimed all three shared one rule.
  const creatorSpaces = editorScopeFor(req.authToken);
  if (creatorSpaces) {
    if (schemaLibrary) {
      // schemaLibrary tokens have no space access — always within any scope.
    } else if (!spaces) {
      res.status(403).json({ error: 'A space-restricted token cannot create an unrestricted (all-spaces) token' });
      return;
    } else {
      const outside = spaces.filter(s => !creatorSpaces.includes(s));
      if (outside.length > 0) {
        res.status(403).json({ error: `Cannot grant access to space(s) outside your own scope: ${outside.join(', ')}` });
        return;
      }
    }
  }

  // schemaLibrary tokens are always read-only and have no space access
  const effectiveReadOnly = schemaLibrary ? true : (readOnly ?? false);
  const effectiveSpaces = schemaLibrary ? [] : spaces;
  const { record, plaintext } = await createToken({ name, expiresAt: expiresAt ?? null, spaces: effectiveSpaces, admin, readOnly: effectiveReadOnly, peerInstanceId, schemaLibrary, mfa, rights: rights as never });
  // Return plaintext only on creation — never retrievable again
  const { hash: _h, ...safeRecord } = record;
  res.status(201).json({ token: safeRecord, plaintext });
});

/**
 * Fields `GET /api/tokens` emits that `PATCH` does not edit — and the remedy for each, where one exists.
 *
 * ## Why this list exists at all
 *
 * A reporter round-tripped a token — GET it, change the name, PATCH it back — and got
 * `Unrecognized key(s) in object: 'spaces'`. Their words: *"the shape you read is not the shape you may
 * write, and nothing says which fields are which."* The response carries twelve fields; PATCH accepted two.
 *
 * ## Why neither obvious fix is right
 *
 * **Stripping them** (the `SERVER_OWNED_TOKEN_FIELDS` treatment) recreates a bug this route already fixed:
 * a body carrying `spaces` or `admin` beside the name was dropped and answered **200**, so an attempt to
 * widen a token through the legacy field looked exactly like one that had worked.
 *
 * **Rejecting them** is what produced the report.
 *
 * So the rule distinguishes an ECHO from a CHANGE, which is the distinction both of those answers lose:
 * the same value back is a round-trip and is ignored; a different value is a refusal that names the field
 * to use instead. `spaces`/`admin`/`readOnly` have a real remedy in the rights matrix and say so — the rest
 * are set at mint and cannot be edited on any route, which the message states rather than implying.
 */
export const ECHOABLE: Record<string, string | null> = {
  spaces: 'set `rights.perSpace` (or `rights.floor` for every space)',

  admin: 'set `rights.instanceAdmin`',
  readOnly: 'set the area rungs in `rights` to `read`',
  createdAt: null,
  lastUsed: null,
  expiresAt: null,
  peerInstanceId: null,
  schemaLibrary: null,
  oauthClientId: null,
};

const ECHOABLE_FIELDS = Object.keys(ECHOABLE);

/**
 * Is this the value already stored, or an attempted change?
 *
 * `spaces` is compared as a SET, because a round-trip may reorder it and an allowlist has no order — but
 * `undefined` is only ever equal to `undefined`. Absent means "all spaces" and `[]` means "no spaces", the
 * conflation this repo has now fixed in four separate files, and it must not come back inside an equality
 * check where reading them as the same would let a token be widened to the whole instance in silence.
 */
export function isEcho(field: string, sent: unknown, stored: unknown): boolean {
  if (field === 'spaces') {
    if (sent === undefined || stored === undefined) return sent === stored;
    if (!Array.isArray(sent) || !Array.isArray(stored) || sent.length !== stored.length) return false;
    return [...sent].sort().join(' ') === [...stored].sort().join(' ');
  }
  // `admin: false` and an absent `admin` are the same token. Only the booleans get this reading.
  if (typeof stored === 'boolean' || typeof sent === 'boolean') return !!sent === !!stored;
  return JSON.stringify(sent ?? null) === JSON.stringify(stored ?? null);
}

const RenameTokenBody = z.object({
  // Same bound as create's `name`, so a label can't be edited to something the create flow would reject.
  name: z.string().min(1).max(200).optional(),
  // `.strict()` for the same reason as create, and here the edge is sharper: this route once accepted a
  // rename ONLY. A body carrying `spaces` or `admin` beside the name was dropped and answered 200, so an
  // attempt to widen a token through it looked exactly like one that had worked.
  //
  // `rights` is now a legitimate field, and `name` is optional so an edit can change either or both. The
  // refine below keeps an empty body from being a silent no-op reported as success.
  rights: z.object({
    instanceAdmin: z.boolean(),
    createSpaces: z.boolean(),
    floor: z.record(z.enum(SPACE_AREAS), z.enum(RUNGS)).nullable(),
    perSpace: z.record(z.string(), z.record(z.enum(SPACE_AREAS), z.enum(RUNGS))),
  }).strict().optional(),
  /**
   * This token's relationship to the second factor — editable HERE and nowhere else.
   *
   * It used to be settable only while minting, which put the decision before there was a token to decide it
   * about: an operator who wanted their scheduler exempt had to revoke it and mint a replacement, rotating a
   * secret to change a flag. It is a property of the token, so it is set on the token.
   *
   * Granting `exempt` costs a live TOTP code on THIS request when the instance switch is on — the same rule
   * create has, applied here for the same reason. `requireAdminMfa` is satisfied by an admin token that is
   * itself exempt, so without it one exemption could grant another by the shorter route, and editing yourself
   * is shorter still than minting.
   */
  mfa: z.enum(['inherit', 'exempt', 'required']).optional(),
  // ── The rest of the record, accepted ONLY unchanged ──────────────────────────────────────────────
  //
  // These are declared so that echoing back a token you just read does not 400 on the first field the
  // schema had never heard of. They are NOT editable here; the handler compares each one it was sent
  // against what is stored, and a DIFFERENT value is a 400 that names what to write instead. See
  // `ECHOABLE` below for why "ignore it" and "reject it" are both wrong answers on their own.
  ...Object.fromEntries(ECHOABLE_FIELDS.map(f => [f, z.unknown()])),
}).strict();

// PATCH /api/tokens/:id — rename a token's label (only) — admin + MFA
tokensRouter.patch('/:id', requireAdminMfa, (req, res) => {
  const parsed = RenameTokenBody.safeParse(stripServerOwnedToken(req.body));
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = req.params['id'] as string;
  const { name, rights, mfa } = parsed.data;
  const previous = listTokens().find(t => t.id === id);
  if (!previous) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }

  // A SPACE-RESTRICTED administrator may only touch its own spaces' rows.
  //
  // `requireAdminMfa` admits a space-restricted admin, because it carries `admin: true` — so before this guard existed,
  // such a token could rename any token on the instance and write `rights.instanceAdmin` onto it. Measured, not
  // supposed: both answered 200 and the rights were stored. They were inert only because the admin routes still gate on
  // the legacy `admin` flag rather than on `rights`.
  //
  // Same rule the MINT route applies to a space-restricted creator, expressed once in `refusalsOutsideEditorScope` so
  // the two cannot drift into disagreeing about what "outside your scope" means.
  const scopeRefusals = refusalsOutsideEditorScope({
    editorSpaces: editorScopeFor(req.authToken),
    target: previous,
    rights: rights as never,
  });
  if (scopeRefusals.length > 0) {
    res.status(403).json({
      error: `A space-restricted administrator cannot make this edit — ${scopeRefusals.join('; ')}.`,
      refusals: scopeRefusals,
    });
    return;
  }

  // An echoed field is a round-trip and is ignored; a CHANGED one is refused by name. Presence is read off
  // the raw body rather than the parsed data, because `z.unknown()` cannot distinguish an absent key from
  // one explicitly set to `undefined` — and "absent" vs "present and null" is the whole question here.
  const sentBody = (stripServerOwnedToken(req.body) ?? {}) as Record<string, unknown>;
  const stored = previous as unknown as Record<string, unknown>;
  const attempted = ECHOABLE_FIELDS
    .filter(f => Object.prototype.hasOwnProperty.call(sentBody, f))
    .filter(f => !isEcho(f, sentBody[f], stored[f]));
  if (attempted.length > 0) {
    res.status(400).json({
      error: `Cannot change ${attempted.map(f => `\`${f}\``).join(', ')} on this route. `
        + attempted.map(f => ECHOABLE[f] ? `For \`${f}\`, ${ECHOABLE[f]}.` : `\`${f}\` is set when the token is minted.`).join(' ')
        + ' Sending these fields UNCHANGED is fine — a token you read back round-trips.',
    });
    return;
  }

  // Checked after the above so a body that only echoes the record gets the "nothing to change" answer
  // rather than a bare unknown-key refusal. It was a `.refine()` until the echo fields existed; a schema
  // cannot see the stored record, so it could not tell an echo from an edit.
  if (name === undefined && rights === undefined && mfa === undefined) {
    res.status(400).json({ error: 'Provide `name`, `rights`, `mfa`, or any combination' });
    return;
  }

  // The same live-code rule create has. `requireAdminMfa` is satisfied by an admin token that is itself
  // exempt, so without this one exemption could grant another — and editing yourself is a shorter route to
  // that than minting a replacement. Checked before anything is written, so a refused exemption leaves the
  // token exactly as it was rather than renamed-but-not-exempted.
  if (!exemptionNeedsLiveCode(req, res, mfa)) return;

  if (rights) {
    // A token may never GRANT above itself, edit or mint. Same rule, same function — a second
    // implementation here is how the two would come to disagree about what "above" means.
    const editorRights = (req.authToken as { rights?: unknown } | undefined)?.rights
      ?? migrateToken(req.authToken ?? {});
    const excess = capRights(editorRights as never, rights as never);
    if (excess.length > 0) {
      res.status(403).json({ error: `A token cannot grant rights it does not hold — ${describeExcess(excess)}` });
      return;
    }

    // And it may never raise its OWN floor. The mint cap stops handing more to a NEW token; without this
    // the same escalation is available by a shorter route — edit yourself, then use yourself — and nothing
    // about the result looks unusual afterwards.
    const raised = refuseSelfFloorRaise(
      (req.authToken as { id?: string } | undefined)?.id,
      editorRights as never,
      id,
      rights as never,
    );
    if (raised.length > 0) {
      res.status(403).json({
        error: `A token cannot raise its own floor — ${raised.join(', ')}. Ask another administrator.`,
      });
      return;
    }
  }

  // `mfa` is in the snapshot on both sides because an exemption is the most security-relevant thing this
  // route can change, and a diff that omitted it would record the rename beside it and not the exemption.
  // `previous.mfa` is absent on every token that follows the instance switch, which reads as `inherit`.
  req.auditSnapshots = {
    before: { name: previous.name, rights: previous.rights, mfa: previous.mfa ?? 'inherit' },
    after: {
      name: name?.trim() ?? previous.name,
      rights: rights ?? previous.rights,
      mfa: mfa ?? previous.mfa ?? 'inherit',
    },
  };

  if (name !== undefined && !renameToken(id, name.trim())) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }
  if (rights && !setTokenRights(id, rights as never)) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }
  if (mfa !== undefined && !setTokenMfa(id, mfa)) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }

  const updated = listTokens().find(t => t.id === id);
  res.json({ token: updated });
});

// POST /api/tokens/:id/regenerate — rotate a token's secret — admin + MFA
tokensRouter.post('/:id/regenerate', authRateLimit, requireAdminMfa, async (req, res) => {
  const plaintext = await regenerateToken(req.params['id'] as string);
  if (!plaintext) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }
  res.json({ plaintext });
});

// DELETE /api/tokens/:id — revoke a token — admin + MFA
tokensRouter.delete('/:id', requireAdminMfa, async (req, res) => {
  const id = req.params['id'] as string;
  const all = listTokens();
  const target = all.find(t => t.id === id);
  if (!target) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }
  // Prevent locking out all admin access
  if (target.admin && all.filter(t => t.admin).length === 1) {
    res.status(409).json({ error: 'Cannot revoke the last admin token' });
    return;
  }
  await revokeToken(id);
  res.status(204).end();
});
