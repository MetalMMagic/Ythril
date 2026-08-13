import type { ToolHandler } from './types.js';
import { list_spacesTool, get_statsTool, get_space_metaTool, er_modelTool, update_spaceTool, update_space_schemaTool, create_spaceTool, reindexTool, wipe_spaceTool , list_tokensTool } from './spaces.js';
import { rememberTool, update_memoryTool, delete_memoryTool } from './memory.js';
import { recallTool, find_similarTool, queryTool } from './search.js';
import { bulk_writeTool } from './bulk.js';
import { merge_entitiesTool, upsert_entityTool, find_entities_by_nameTool, update_entityTool, delete_entityTool } from './entity.js';
import { upsert_edgeTool, traverseTool, update_edgeTool, delete_edgeTool } from './edge.js';
import { create_chronoTool, update_chronoTool, list_chronoTool, delete_chronoTool } from './chrono.js';
import { read_fileTool, write_fileTool, list_dirTool, delete_fileTool, create_dirTool, move_fileTool, retry_embeddingTool } from './file.js';
import { list_peersTool, sync_nowTool } from './sync.js';
import { helpTool } from './help.js';
import { list_embed_jobsTool, retry_record_embeddingTool } from './embed.js';

export type { ToolHandler, ToolContext, ToolResult, ToolSchemas } from './types.js';

/**
 * The MCP tool registry - the single source of truth.
 *
 * `tools/list`, the read-only gate, the admin gate and the space-required gate are
 * ALL derived from these entries, so adding a tool means adding it here and nowhere
 * else. Order is preserved so `tools/list` stays stable.
 */
export const ALL_TOOLS: ToolHandler[] = [
  helpTool,
  list_spacesTool,
  rememberTool,
  recallTool,
  find_similarTool,
  merge_entitiesTool,
  update_memoryTool,
  delete_memoryTool,
  get_statsTool,
  get_space_metaTool,
  er_modelTool,
  queryTool,
  upsert_entityTool,
  find_entities_by_nameTool,
  upsert_edgeTool,
  traverseTool,
  update_entityTool,
  update_edgeTool,
  // The three deletes an agent could not reach: REST has deleted all four record types since it existed,
  // MCP had `delete_memory` alone, so the only way to remove one edge was to wipe the whole space.
  delete_entityTool,
  delete_edgeTool,
  create_chronoTool,
  update_chronoTool,
  delete_chronoTool,
  list_chronoTool,
  read_fileTool,
  write_fileTool,
  list_dirTool,
  delete_fileTool,
  retry_embeddingTool,
  create_dirTool,
  move_fileTool,
  update_spaceTool,
  update_space_schemaTool,
  create_spaceTool,
  reindexTool,
  wipe_spaceTool,
  list_tokensTool,
  bulk_writeTool,
  list_peersTool,
  sync_nowTool,
  list_embed_jobsTool,
  retry_record_embeddingTool,
];

export const TOOLS_BY_NAME: ReadonlyMap<string, ToolHandler> =
  new Map(ALL_TOOLS.map(t => [t.name, t]));
