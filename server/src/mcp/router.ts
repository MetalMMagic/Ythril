import { Router } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';
import { globalRateLimit } from '../rate-limit/middleware.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import { resolveMemberSpaces } from '../spaces/proxy.js';
import { ALL_TOOLS, TOOLS_BY_NAME, type ToolSchemas } from './tools/index.js';
import { makeArgsValidator } from './validate-args.js';

// Session map: sessionId → transport
const transports = new Map<string, SSEServerTransport>();

// Identity binding for SSE sessions (S2). Each open SSE session is pinned to the
// id of the token that opened it and a signature of that token's authorization
// scopes. `POST /mcp/messages?sessionId=…` must present the *same* token id, and
// that token's *current* scopes must still match — otherwise the request is
// rejected. Without this, any valid token that learns another session's id (it
// travels as a query parameter, so it lands in proxy logs and browser history)
// could drive tool calls with the opening session's privileges.
interface SessionBinding {
  tokenId: string;
  scopeSig: string;
}
const sessionBindings = new Map<string, SessionBinding>();

/** Stable signature of a token's authorization scopes, order-independent. */
function scopeSignature(t: { admin?: boolean; readOnly?: boolean; spaces?: string[] } | undefined): string {
  return JSON.stringify([
    Boolean(t?.admin),
    Boolean(t?.readOnly),
    [...(t?.spaces ?? [])].sort(),
  ]);
}

/** Short, non-reversible tag for correlating an SSE session in logs without
 *  emitting the raw sessionId (which is a bearer-equivalent routing secret). */
function sessionTag(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 12);
}

/** Create an MCP Server instance with tools operating across all accessible spaces.
 *
 *  Tool schemas, authorization gates and handlers all come from the registry in
 *  ./tools — there is one source of truth per tool. */
/**
 * @param audit  Caller identity for the audit trail. Passed in rather than read from a request here
 *   because the SSE transport builds the server once per CONNECTION and then serves many tool calls
 *   over it — there is no `req` in scope at dispatch time, only the one that opened the stream.
 */
function createGlobalMcpServer(tokenSpaces?: string[], readOnly?: boolean, isAdmin?: boolean, tokenId?: string, tokenLabel?: string,
  audit?: { ip: string; authMethod: 'pat' | 'oidc' | null; oidcSubject: string | null; transport: 'sse' | 'http' }): Server {
  const cfg = getConfig();
  const accessibleSpaces = cfg.spaces.filter(s => !tokenSpaces || tokenSpaces.includes(s.id));
  const accessibleSpaceIds = accessibleSpaces.map(s => s.id);
  const spacesLine = accessibleSpaces.length > 0
    ? accessibleSpaces.map(s => s.id + (s.label ? ` ("${s.label.replace(/[\x00-\x1f]/g, '').slice(0, 200)}")` : '')).join(', ')
    : '(none accessible)';
  const instructions = `Ythril knowledge graph — global mode.\nAvailable spaces: ${spacesLine}.\nEach tool requires a "space" parameter (except recall, list_chrono, and find_similar, where it is optional and enables cross-space results when omitted; and list_peers/sync_now which are global). Call list_spaces for details. Tool arguments are validated against each tool's inputSchema (from tools/list) — read it before calling.`;

  const server = new Server(
    { name: 'ythril', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions },
  );

  const spaceEnumBase = accessibleSpaceIds.length > 0 ? { enum: accessibleSpaceIds } : {};

  // The `space` enum depends on this token's accessible spaces, so tool schemas
  // are built per server instance rather than being static.
  const schemas: ToolSchemas = {
    requiredSpace: { type: 'string' as const, ...spaceEnumBase, description: 'Space ID to operate on. Use list_spaces to discover available spaces.' },
    optionalSpace: { type: 'string' as const, ...spaceEnumBase, description: 'Optional space ID. Omit to search across all accessible spaces.' },
  };

  // Enforce each tool's advertised inputSchema on incoming args (not just the JSON-RPC envelope), so the
  // schema tools/list publishes is the real contract. Built per connection because the `space` enum is
  // token-scoped; handlers keep their semantic checks on top.
  const argsValidator = makeArgsValidator(schemas);

  // Tools this token may see: read-only tokens lose mutating tools, non-admin
  // tokens lose instance-level tools. Both gates are re-enforced on dispatch.
  const visibleTools = ALL_TOOLS.filter(t => !(readOnly && t.mutating) && !(!isAdmin && t.admin));

  // ── tools/list ────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: visibleTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema(schemas),
    })),
  }));

  /**
   * Write one audit entry per tool call.
   *
   * Under the operation the tool's REST counterpart records, not `mcp.<tool>` — a compliance reader
   * asks who created a memory, not who invoked a tool, and two names for one act makes every query
   * have to know both. `path` carries the tool name so the transport is still recoverable.
   *
   * Reads follow the REST convention: recorded only when `logReads` is on. Fire-and-forget, like
   * every other audit write — a failing log must never fail the operation it is describing.
   */
  function recordToolCall(toolName: string, spaceId: string, status: number, durationMs: number): void {
    const operation = mcpAuditOperation(toolName);
    if (!operation) return;                       // deliberately not an audited operation — see audit-map.ts
    if (isMcpReadOperation(operation) && !getConfig().audit?.logReads) return;
    logAuditEntry({
      tokenId: tokenId ?? null,
      tokenLabel: tokenLabel ?? null,
      authMethod: audit?.authMethod ?? null,
      oidcSubject: audit?.oidcSubject ?? null,
      ip: audit?.ip ?? '',
      method: 'MCP',
      path: `${audit?.transport ?? 'http'}:${toolName}`,
      spaceId: spaceId || null,
      operation,
      status,
      durationMs,
    });
  }

  // ── tools/call ────────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as Record<string, unknown>;

    // Unknown tools fall through the gates below (they carry no flags) and are
    // reported inside the try block, preserving the original dispatch behaviour.
    const tool = TOOLS_BY_NAME.get(name);

    // Block mutating tools for read-only tokens
    if (readOnly && tool?.mutating) {
      return {
        content: [{ type: 'text' as const, text: 'Error: this token has read-only access' }],
        isError: true,
      };
    }

    // Block instance-level tools for non-admin tokens (filtering them out of
    // tools/list is advisory — the dispatcher is the enforcement point).
    if (!isAdmin && tool?.admin) {
      return {
        content: [{ type: 'text' as const, text: `Error: tool '${name}' requires an admin token` }],
        isError: true,
      };
    }

    // Validate space parameter
    const rawSpace = typeof a['space'] === 'string' ? a['space'].trim() : '';
    if (tool?.spaceRequired && !rawSpace) {
      return { content: [{ type: 'text' as const, text: `Error: tool '${name}' requires a 'space' parameter` }], isError: true };
    }
    if (rawSpace) {
      if (!cfg.spaces.some(s => s.id === rawSpace)) {
        return { content: [{ type: 'text' as const, text: `Error: Space '${rawSpace}' not found` }], isError: true };
      }
      if (tokenSpaces && !tokenSpaces.includes(rawSpace)) {
        return { content: [{ type: 'text' as const, text: `Error: token does not have access to space '${rawSpace}'` }], isError: true };
      }
      // Proxy fan-out scope check: a proxy space aggregates reads across (and
      // routes writes to) its member spaces. The token must hold EVERY member
      // space — mirroring requireSpaceAuth on the REST layer — otherwise a token
      // scoped only to the proxy (especially a `proxyFor: ['*']` wildcard) could
      // read/write member spaces it was never granted. For a non-proxy space
      // resolveMemberSpaces returns [rawSpace], so this is a no-op there.
      if (tokenSpaces) {
        const members = resolveMemberSpaces(rawSpace);
        const missing = members.filter(m => !tokenSpaces.includes(m));
        if (missing.length > 0) {
          return { content: [{ type: 'text' as const, text: `Error: token does not have access to member space(s) of '${rawSpace}': ${missing.join(', ')}` }], isError: true };
        }
      }
    }
    const callSpace = rawSpace;

    try {
      mcpToolCallsTotal.inc({ tool: name, space: callSpace || 'global' });
      if (!tool) {
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }
      // Enforce the advertised inputSchema before the handler runs — except partial-success tools
      // (bulk_write), which report per-item errors in the result rather than rejecting the whole call.
      if (!tool.skipSchemaValidation) {
        const argErr = argsValidator.validate(tool, a);
        if (argErr) {
          return { content: [{ type: 'text' as const, text: `Error: ${argErr}` }], isError: true };
        }
      }
      const startedAt = Date.now();
      const result = await tool.handle({
        args: a,
        callSpace,
        name,
        cfg,
        accessibleSpaces,
        accessibleSpaceIds,
        tokenSpaces,
        isAdmin,
        readOnly,
        actor: { tokenId, tokenLabel },
      });
      // A tool that returns `isError` failed on its own terms — the transport still answered 200, so
      // the audit status has to come from the RESULT or the log would record every rejected write as
      // a success. 422 rather than 400: the call was well-formed and the handler refused it.
      recordToolCall(name, callSpace, result?.isError ? 422 : 200, Date.now() - startedAt);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`MCP global tool '${name}' error in space '${callSpace || 'global'}': ${message}`);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// ── Express router ───────────────────────────────────────────────────────────

import { requireMcpAuth } from '../auth/middleware.js';
import { logAuditEntry } from '../audit/audit.js';
import { auditAuthMethod, auditOidcSubject } from '../audit/middleware.js';
import { mcpAuditOperation, isMcpReadOperation } from './audit-map.js';
import { mcpConnectionsActive, mcpToolCallsTotal } from '../metrics/registry.js';

export const mcpRouter = Router();

// All MCP routes require authentication — unauthenticated requests must not
// fall through to the SPA and return 200. On a 401 this also emits the RFC 9728
// WWW-Authenticate header so OAuth browser connectors can discover the
// authorization server and begin the OAuth flow.
mcpRouter.use(requireMcpAuth);

// GET /mcp  — global SSE stream (space is a tool parameter, not a URL segment)
mcpRouter.get('/', globalRateLimit, async (req, res) => {
  const postEndpoint = '/mcp/messages';
  const transport = new SSEServerTransport(postEndpoint, res);
  transports.set(transport.sessionId, transport);
  sessionBindings.set(transport.sessionId, {
    tokenId: req.authToken?.id ?? '',
    scopeSig: scopeSignature(req.authToken),
  });
  mcpConnectionsActive.inc();

  res.on('close', () => {
    transports.delete(transport.sessionId);
    sessionBindings.delete(transport.sessionId);
    mcpConnectionsActive.dec();
    log.debug(`MCP global session ${sessionTag(transport.sessionId)} closed`);
  });

  const server = createGlobalMcpServer(req.authToken?.spaces, req.authToken?.readOnly, req.authToken?.admin, req.authToken?.id, req.authToken?.name,
    { ip: req.ip ?? '', authMethod: auditAuthMethod(req.authToken), oidcSubject: auditOidcSubject(req.authToken), transport: 'sse' });
  log.debug(`MCP global session ${sessionTag(transport.sessionId)} opened`);
  await server.connect(transport);
});

// POST /mcp/messages  — global tool call (SSE transport)
mcpRouter.post('/messages', globalRateLimit, async (req, res) => {
  const sessionId = String(req.query['sessionId'] ?? '');
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: 'Unknown MCP session. Open an SSE connection first.' });
    return;
  }
  // S2: the POST must be driven by the *same* token that opened the SSE session,
  // and that token's scopes must not have changed since. requireMcpAuth has
  // already re-validated the bearer (a revoked/expired token never reaches here),
  // so this closes cross-token hijacking and mid-session privilege staleness.
  const binding = sessionBindings.get(sessionId);
  if (!binding || binding.tokenId !== (req.authToken?.id ?? '') || binding.scopeSig !== scopeSignature(req.authToken)) {
    log.warn(`MCP session ${sessionTag(sessionId)} rejected: token does not match the identity that opened it`);
    res.status(403).json({ error: 'This MCP session is bound to a different identity. Open your own SSE connection.' });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});

// POST /mcp  — Streamable HTTP transport (stateless, per-request)
// Supports both application/json (synchronous response) and text/event-stream (SSE upgrade).
// This transport requires no persistent connection and works through standard HTTP proxies.
mcpRouter.post('/', globalRateLimit, async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createGlobalMcpServer(req.authToken?.spaces, req.authToken?.readOnly, req.authToken?.admin, req.authToken?.id, req.authToken?.name,
    { ip: req.ip ?? '', authMethod: auditAuthMethod(req.authToken), oidcSubject: auditOidcSubject(req.authToken), transport: 'http' });
  // Register cleanup before handling the request so it fires regardless of outcome.
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    log.error('MCP Streamable HTTP error', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: (req.body as Record<string, unknown>)?.id ?? null,
      });
    }
  }
});

// Catch-all for unrecognised MCP paths — must not fall through to SPA
mcpRouter.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
