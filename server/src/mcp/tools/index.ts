import type { ToolHandler } from './types.js';
import { list_spacesTool, get_statsTool, get_space_metaTool, update_spaceTool, wipe_spaceTool } from './spaces.js';
import { rememberTool, recallTool, find_similarTool, update_memoryTool, delete_memoryTool, queryTool, bulk_writeTool } from './memory.js';
import { merge_entitiesTool, upsert_entityTool, find_entities_by_nameTool, update_entityTool } from './entity.js';
import { upsert_edgeTool, traverseTool, update_edgeTool } from './edge.js';
import { create_chronoTool, update_chronoTool, list_chronoTool } from './chrono.js';
import { read_fileTool, write_fileTool, list_dirTool, delete_fileTool, create_dirTool, move_fileTool } from './file.js';
import { list_peersTool, sync_nowTool } from './sync.js';

export type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';

/**
 * The MCP tool registry - the single source of truth.
 *
 * `tools/list`, the read-only gate, the admin gate and the space-required gate are
 * ALL derived from these entries, so adding a tool means adding it here and nowhere
 * else. Order is preserved so `tools/list` stays stable.
 */
export const ALL_TOOLS: ToolHandler[] = [
  list_spacesTool,
  rememberTool,
  recallTool,
  find_similarTool,
  merge_entitiesTool,
  update_memoryTool,
  delete_memoryTool,
  get_statsTool,
  get_space_metaTool,
  queryTool,
  upsert_entityTool,
  find_entities_by_nameTool,
  upsert_edgeTool,
  traverseTool,
  update_entityTool,
  update_edgeTool,
  create_chronoTool,
  update_chronoTool,
  list_chronoTool,
  read_fileTool,
  write_fileTool,
  list_dirTool,
  delete_fileTool,
  create_dirTool,
  move_fileTool,
  update_spaceTool,
  wipe_spaceTool,
  bulk_writeTool,
  list_peersTool,
  sync_nowTool,
];

export const TOOLS_BY_NAME: ReadonlyMap<string, ToolHandler> =
  new Map(ALL_TOOLS.map(t => [t.name, t]));
