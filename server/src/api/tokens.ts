import { Router } from 'express';
import { requireAuth, requireAdmin, requireAdminMfa } from '../auth/middleware.js';
import { authRateLimit, globalRateLimit } from '../rate-limit/middleware.js';
import { createToken, listTokens, revokeToken, regenerateToken, renameToken } from '../auth/tokens.js';
import { z } from 'zod';

export const tokensRouter = Router();

// GET /api/auth/me — returns the current token's metadata (used by the Angular SPA to verify a PAT)
tokensRouter.get('/me', globalRateLimit, requireAuth, (req, res) => {
  res.json(req.authToken);
});

const CreateTokenBody = z.object({
  name: z.string().min(1).max(200),
  expiresAt: z.string().datetime().nullish(),
  spaces: z.array(z.string().min(1)).max(1000).optional(),
  admin: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  peerInstanceId: z.string().uuid().optional(),
  schemaLibrary: z.boolean().optional(),
});

// GET /api/tokens — list tokens (hashes excluded) — admin only
tokensRouter.get('/', requireAdmin, (_req, res) => {
  res.json({ tokens: listTokens() });
});

// POST /api/tokens — create a new PAT — admin + MFA
// admin:true may only be set when the calling token is itself admin (enforced by requireAdminMfa above)
tokensRouter.post('/', authRateLimit, requireAdminMfa, async (req, res) => {
  const parsed = CreateTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, expiresAt, spaces, admin, readOnly, peerInstanceId, schemaLibrary } = parsed.data;
  if (admin && readOnly) {
    res.status(400).json({ error: 'A token cannot be both admin and readOnly' });
    return;
  }
  if (schemaLibrary && (admin || spaces?.length)) {
    res.status(400).json({ error: 'A schemaLibrary token cannot have admin or space access' });
    return;
  }

  // Privilege-escalation guard: a space-restricted creator (its token carries a
  // `spaces` allow-list) may only mint tokens confined to a SUBSET of its own
  // spaces. Without this, a token scoped to space A could mint an unrestricted
  // token (no `spaces` = all spaces, `admin: true`) and defeat its own scoping.
  // An unrestricted creator (no `spaces`) may mint any scope.
  const creatorSpaces = req.authToken?.spaces;
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
  const { record, plaintext } = await createToken({ name, expiresAt: expiresAt ?? null, spaces: effectiveSpaces, admin, readOnly: effectiveReadOnly, peerInstanceId, schemaLibrary });
  // Return plaintext only on creation — never retrievable again
  const { hash: _h, ...safeRecord } = record;
  res.status(201).json({ token: safeRecord, plaintext });
});

const RenameTokenBody = z.object({
  // Same bound as create's `name`, so a label can't be edited to something the create flow would reject.
  name: z.string().min(1).max(200),
});

// PATCH /api/tokens/:id — rename a token's label (only) — admin + MFA
tokensRouter.patch('/:id', requireAdminMfa, (req, res) => {
  const parsed = RenameTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = req.params['id'] as string;
  const ok = renameToken(id, parsed.data.name.trim());
  if (!ok) {
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
