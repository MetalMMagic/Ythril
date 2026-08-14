import { TOOL_RIGHTS } from '../auth/space-rights.js';
import { effectiveRung } from '../auth/mint-cap.js';
import { satisfies } from '../auth/required-rung.js';
import type { TokenRights } from '../config/rights-shape.js';

/**
 * Does this token hold the rung this tool needs, in this space?
 *
 * Returns the refusal TEXT, or `null` to allow — so the dispatcher's job is one line and this decision can
 * be exercised without standing up an MCP server. Pure on purpose, for the same reason
 * `resolveFindSimilarScope` is: a guard that can only be tested through a transport gets tested by reading
 * it, and a source-reading test cannot tell live code from dead. The first version of this check WAS a
 * source grep, and it passed against `if (false && !satisfies(...))`.
 *
 * ## What it is fixing
 *
 * Until 3.0 the MCP dispatcher gated on two booleans — `readOnly`, and the tool's `admin` flag — while REST
 * enforced a per-space, per-area rung. One policy, two implementations, and the weaker one was reachable.
 * Measured, not inferred: a token whose matrix said `perSpace.general.knowledge = 'write'` was refused
 * `DELETE /api/brain/spaces/general/memories/:id` with a 403, and the identical delete through
 * `delete_memory` answered "Memory deleted".
 *
 * ## The two ways it deliberately does nothing
 *
 * - **No rights matrix.** Every token created since 2.9 carries one and a boot migration backfills the
 *   rest, so in practice this is the OIDC path, where the record is built per request from the identity
 *   and legitimately has none. Those are still governed by `readOnly` and the `admin` flag.
 * - **No row for the tool.** It is instance-level — `list_spaces`, `create_space`, `list_tokens`,
 *   `list_peers`, `sync_now`, `wipe_space`, `help` — and governed by the tool's `admin` flag against
 *   `instanceAdmin`, because the capability is not scoped to a space at all.
 *
 * The space is the one the CALLER named. For a proxy that is the proxy's own id, which is where an operator
 * grants access to a proxy; narrowing to members happens inside the tools. Checking a member here would let
 * a proxy grant be bypassed by naming the member instead.
 */
export function toolRightsRefusal(
  toolName: string,
  rights: TokenRights | undefined,
  space: string,
): string | null {
  if (!rights || !space) return null;
  const need = TOOL_RIGHTS.find(r => r.tool === toolName);
  if (!need) return null;

  const held = effectiveRung(rights, space, need.area);
  if (satisfies(held, need.needs)) return null;

  return `Error: tool '${toolName}' needs ${need.area}: ${need.needs} on space '${space}'; `
    + `this token holds ${need.area}: ${held}`;
}
