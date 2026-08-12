/**
 * Capabilities that exist over REST and not over MCP, declared rather than discovered.
 *
 * ## Why this file exists
 *
 * breituai-platform, 2026-08-11T1722Z, and the principle is theirs: *"The rights matrix decides what a token may
 * do; the surface should not also decide whether it can."* They hit five of these in one day of ordinary work —
 * none from auditing the API — and the worst part of the report is not the five. It is that they could not tell
 * **absent** from **gated**: a capability hidden behind a right they lacked and a capability that was never
 * built look identical from outside, and one is a documentation fix while the other is an afternoon.
 *
 * So the gap is written down, machine-readable, with the reason beside it. A hole becomes a row with a blank
 * rather than a discovery. Their own smaller ask was exactly this, and it is worth shipping ahead of parity
 * itself because it makes the remaining work legible to the people waiting on it.
 *
 * ## The rule this file is under
 *
 * A row here is a PROMISE THAT SOMETHING IS MISSING. `mcp-rest-parity.test.js` asserts both halves of every row:
 * the REST route named actually exists, and no MCP tool by that name exists. So a row cannot rot in either
 * direction — the day someone builds `reindex` as a tool, the gate fails until the row is deleted, and the day
 * someone renames the REST route, the gate fails until the row is corrected.
 *
 * That is deliberate. A hand-maintained list is what produced five gaps; a hand-maintained list of the gaps
 * would produce the same problem one level up.
 */

/** One capability reachable over REST and not over MCP. */
export interface RestOnlyCapability {
  /** What an operator would call it. */
  capability: string;
  /** The REST route, exactly as the router declares it. Asserted to exist. */
  restEndpoint: string;
  /** HTTP method, for a caller building the request. */
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** The tool name it WOULD have, asserted NOT to exist while this row stands. */
  wouldBeTool: string;
  /** Why it is not on MCP yet — never "no reason", because that is what a blank invites. */
  why: string;
}

/**
 * The five they reported, minus the ones now built. Nothing invented alongside them.
 *
 * Confirmed absent rather than gated on 2026-08-12 by reading the tool registry: 34 tools, none of which was a
 * reindex, a token list, a `retry_embedding` or a space create. `update_space` existed but accepted only `label`,
 * `purpose` and `description`, so nothing on MCP wrote a schema — their reading was right on every one.
 *
 * **Four rows have now been deleted by being built**, which is the only way a row leaves this list:
 * `retry_embedding`, `list_tokens`, `update_space_schema`, and — with it — the belief that these were wrappers.
 * The last two of the five, `reindex` and `create_space`, each still need their route's validation extracted before
 * a tool can call it without skipping the refusals. `mcp-rest-parity.test.js` asserts both halves of every surviving
 * row, so a row cannot rot in either direction.
 */
export const REST_ONLY_CAPABILITIES: readonly RestOnlyCapability[] = [
  {
    capability: 'Rebuild a space\'s vector indexes',
    restEndpoint: '/api/brain/spaces/:spaceId/reindex',
    method: 'POST',
    wouldBeTool: 'reindex',
    why: 'Not built. They reindexed 19 spaces by hand in a shell loop because the agent that planned their '
      + 'embedder migration could not run it. Async already, with /reindex-status to poll, so a tool is a thin wrapper.',
  },
  {
    capability: 'Create a space',
    restEndpoint: '/api/spaces',
    method: 'POST',
    wouldBeTool: 'create_space',
    why: 'Not built, including the descriptor-width parameter. A token holding `createSpaces` in the rights '
      + 'matrix cannot exercise it over MCP, which is the exact shape of their complaint.',
  },
] as const;

/**
 * The capability map `help()` reports, so a caller can see the gap without asking anyone.
 *
 * Shaped as rows rather than prose because they asked for something machine-readable: their agents branch on it.
 */
export function restOnlyCapabilityMap(): {
  note: string;
  capabilities: { capability: string; mcpTool: null; restEndpoint: string; method: string; why: string }[];
} {
  return {
    note: 'These capabilities exist over REST and are NOT yet on MCP. Each row is a confirmed absence, not a '
      + 'permission you lack — a tool you cannot see because of your token is hidden from tools/list instead.',
    capabilities: REST_ONLY_CAPABILITIES.map(c => ({
      capability: c.capability,
      mcpTool: null,
      restEndpoint: c.restEndpoint,
      method: c.method,
      why: c.why,
    })),
  };
}
