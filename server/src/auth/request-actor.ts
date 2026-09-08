/**
 * Who made this request, in the one shape everything that records an actor already uses.
 *
 * ## Why it is a module and not two lines at each door
 *
 * Seven brain write doors needed it at once for `F-25`, and the MCP half already had it: its tool context
 * carries `actor: { tokenId, tokenLabel }`, resolved once in `mcp/router.ts`. REST had no counterpart, so the
 * first draft of those seven doors read `req.authToken?.label` — a field that does not exist on either
 * record type. It compiled nowhere, which was lucky: the same expression written as `?.name` compiles, is
 * wrong for nothing today, and is the shape that goes on to disagree with the audit log the moment either
 * side gains a case.
 *
 * The audit middleware already answers this question (`tokenLabel: token?.name ?? null`). This is that
 * answer, named, so the two surfaces and the audit log cannot describe the same actor three ways.
 *
 * ## `name`, not `label`
 *
 * Both record shapes carry `id` and `name` — a PAT's name is what an operator typed when minting it, and an
 * OIDC identity's is derived from `preferred_username`, then email, then `sub`. The field is called
 * `tokenLabel` on the way OUT because that is what the audit log, the webhook payloads and the MCP context
 * have always called it; renaming those to match the source would be a wire change to fix a spelling.
 *
 * ## An absent token is `null`, and that is an answer
 *
 * Not every write arrives with one — a first-run path, a future internal caller. `null` records the write as
 * having an unknown author, which is the honest reading; DROPPING it would make any count computed from
 * these lower than the truth, and a lower count is indistinguishable from a quieter system.
 */
import type { Request } from 'express';

/** An actor as every consumer already spells it. */
export interface RequestActor {
  tokenId: string | null;
  tokenLabel: string | null;
}

export function requestActor(req: Pick<Request, 'authToken'>): RequestActor {
  const t = req.authToken;
  return { tokenId: t?.id ?? null, tokenLabel: t?.name ?? null };
}
