import type { Config, SpaceConfig } from '../../config/types.js';
import type { WebhookActor } from '../../webhooks/dispatcher.js';

/**
 * The space schemas injected into each tool's `inputSchema`. The `space` enum is
 * derived from the calling token's accessible spaces, so schemas are built per
 * server instance rather than being static constants.
 */
export interface ToolSchemas {
  requiredSpace: Record<string, unknown>;
  optionalSpace: Record<string, unknown>;
}

/**
 * Everything a tool handler needs. Built once per `tools/call` by the dispatcher,
 * after the read-only / admin / space gates have already passed.
 */
export interface ToolContext {
  /** Raw tool arguments. */
  args: Record<string, unknown>;
  /** Validated space id for this call ('' for instance-level tools). */
  callSpace: string;
  /** The tool's own name (used in a few error messages). */
  name: string;
  cfg: Config;
  accessibleSpaces: SpaceConfig[];
  accessibleSpaceIds: string[];
  tokenSpaces?: string[];
  isAdmin?: boolean;
  /** True when the calling token is read-only (mutating tools are gated out). */
  readOnly?: boolean;
  /** Identity of the calling token, for webhook attribution. Passed to shared brain/file
   *  mutation functions so agent-driven writes emit attributed webhooks like REST writes. */
  actor?: WebhookActor;
}

export type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/**
 * A single MCP tool: schema, authorization flags, and handler - all in one place.
 *
 * The dispatcher derives `tools/list` AND every gate from these flags, so each
 * tool has exactly one source of truth. Previously a tool was spread across three
 * separate `Set`s (MUTATING/ADMIN/SPACE_REQUIRED), a schema in a big array, and a
 * `case` in a 1,200-line switch - four places that had to be kept in sync by hand.
 */
export interface ToolHandler {
  name: string;
  description: string;
  /** Rejected for read-only tokens. */
  mutating?: boolean;
  /** Requires an admin token (instance-level, no space scoping). */
  admin?: boolean;
  /** Requires a non-empty `space` argument. */
  spaceRequired?: boolean;
  inputSchema(s: ToolSchemas): Record<string, unknown>;
  handle(ctx: ToolContext): Promise<ToolResult>;
}
