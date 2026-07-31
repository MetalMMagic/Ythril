/**
 * Which audit operation each MCP tool records.
 *
 * ## Why this file exists
 *
 * MCP tool calls were not audited **at all**. Every write an agent made — `remember`, `upsert_entity`,
 * `bulk_write`, `wipe_space` — left the audit log unchanged, while the REST equivalent of each one wrote
 * an entry. For a product whose primary write path is an agent, that is most of the trail missing.
 *
 * The gap was not an oversight nobody had considered. The HTTP audit middleware explicitly admits `/mcp`:
 *
 *     if (!fullPath.startsWith('/api/') && !fullPath.startsWith('/mcp')) return;
 *
 * and then drops it one line later, because no `ROUTE_RULES` entry matches. Someone intended this to
 * work. What kept it from being noticed was `audit-route-coverage`, whose `/mcp` exemption read *"MCP has
 * its own tool-level audit path"* — describing a path that did not exist.
 *
 * ## Why the existing vocabulary, and not `mcp.tool_call`
 *
 * A compliance reader asks "who created this memory", not "who invoked a tool". Recording
 * `mcp.remember` would make the audit log unanswerable across surfaces: the same act, performed through
 * REST and through MCP, would appear under two names, and every query would have to know both. So a tool
 * records the operation its REST counterpart records, and the transport is a separate field.
 *
 * ## Why every tool must appear here
 *
 * The entries are not an allowlist with silent gaps — `mcp-audit-coverage.test.js` asserts this map's
 * keys are exactly the registered tool names. A new tool fails the build until it is classified, which is
 * the opposite of how the original gap survived: there, the absence of a rule *was* the default.
 *
 * `null` means "not an audited operation", and each `null` carries its reason. That is the same
 * exemption-with-a-reason discipline the route gates use — and two of those reasons turned out to be
 * false when checked this week, so a reason here is written to be checkable against the code.
 */

/** Tool name → the audit operation it performs, or `null` with the reason it is not one. */
export const MCP_TOOL_OPERATIONS: Record<string, string | null> = {
  // ── Mutations. Each records exactly what its REST counterpart records. ──────────────────────────
  remember: 'memory.create',
  update_memory: 'memory.update',
  delete_memory: 'memory.delete',
  upsert_entity: 'entity.create',
  update_entity: 'entity.update',
  merge_entities: 'entity.merge',
  upsert_edge: 'edge.create',
  update_edge: 'edge.update',
  create_chrono: 'chrono.create',
  update_chrono: 'chrono.update',
  bulk_write: 'bulk.write',
  update_space: 'space.update',
  wipe_space: 'space.wipe',
  write_file: 'file.create',
  move_file: 'file.update',
  delete_file: 'file.delete',
  create_dir: 'file.mkdir',
  // The tool registry flags this `mutating: true`, and it is right: a sync cycle pulls records from
  // peers and writes them locally, so "who started the run that brought in these records" is a fair
  // audit question. `/api/notify` is exempt on the REST side as "peer notifications + the admin sync
  // trigger — not a data mutation"; the peer half is right and the trigger half was not, so
  // `/api/notify/trigger` records `sync.trigger` too and the two surfaces agree.
  sync_now: 'sync.trigger',

  // ── Reads. Recorded only when `logReads` is on, exactly as the REST reads are. ──────────────────
  query: 'brain.query',
  recall: 'brain.recall',
  traverse: 'brain.traverse',
  get_stats: 'brain.stats',
  list_chrono: 'chrono.list',
  list_spaces: 'space.list',
  list_dir: 'file.list',
  read_file: 'file.read',
  find_entities_by_name: 'entity.list',
  // A vector-similarity search over existing entries — a read of the same records `entity.list` covers.
  find_similar: 'entity.list',
  // Returns the space's schema and counts. `space.list` is the REST read that exposes the same shape.
  get_space_meta: 'space.list',

  // ── Not audited operations, with the reason each. ──────────────────────────────────────────────
  // Returns this instance's own documentation. Reads no space and no record.
  help: null,
  // Lists configured peers from local config. There is no `network.list` operation on the REST side
  // either — peer topology is read from `/api/networks`, which is itself unaudited as a read.
  list_peers: null,
};

/**
 * The operation for a tool call, or `null` when the tool is deliberately not an audited operation.
 *
 * An UNKNOWN tool also returns `null` rather than throwing: the dispatcher already reports unknown tools
 * to the caller, and an audit helper is the wrong place to turn a bad tool name into a 500. The coverage
 * test is what guarantees no *registered* tool reaches here unclassified.
 */
export function mcpAuditOperation(toolName: string): string | null {
  return MCP_TOOL_OPERATIONS[toolName] ?? null;
}

/** Operations that are reads — logged only when `logReads` is enabled, matching the REST convention. */
const READ_OPERATIONS = new Set([
  'brain.query', 'brain.recall', 'brain.traverse', 'brain.stats',
  'chrono.list', 'space.list', 'file.list', 'file.read', 'entity.list',
]);

export function isMcpReadOperation(operation: string): boolean {
  return READ_OPERATIONS.has(operation);
}
