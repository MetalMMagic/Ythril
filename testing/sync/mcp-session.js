/**
 * One MCP client helper, shared.
 *
 * ## What it was, and why the rewrite finally forced the migration
 *
 * This was an SSE harness: open `GET /mcp`, wait for an `endpoint` event carrying a `sessionId`, POST each
 * JSON-RPC call to `/mcp/messages?sessionId=…`, and read the answers back off the stream in FIFO order. That
 * ~90-line dance had been copy-pasted into TEN test files before this module existed (`mcp-tools`, `mcp`,
 * `mcp-reindex`, `mcp-create-space`, `mcp-update-space-schema`, `dupe-detection`, `proxy-spaces`,
 * `recall-filter`, `recall-traverse`, and the red-team `mcp-security`), and its own docblock called migrating
 * them "a mechanical follow-up, deliberately not folded into the feature PR that needed the eleventh copy".
 *
 * 4.0 removes the SSE transport, so the follow-up stopped being optional: ten copies of a transport harness
 * are ten suites that start timing out for reasons that look like the server's fault. They import this now.
 *
 * ## Streamable HTTP has no session, so most of the harness was the transport's problem
 *
 * `POST /mcp` is stateless: one request carries one JSON-RPC call and answers it, either as
 * `application/json` or as a single `text/event-stream` frame. No handshake, no session id, no reply
 * correlation — so the FIFO waiter queue, the endpoint-event poll and the stream parser are all gone. What
 * survives is `{callTool, listTools, close}`, unchanged, so a caller does not know the transport moved.
 *
 * The FIFO queue is worth one line of epitaph, because its reasoning outlived it: matching response frames by
 * POSITION returns the PREVIOUS answer, which makes a test pass while asserting on the wrong call. Under a
 * request-response transport a reply cannot be mismatched to a call at all.
 *
 * `close()` is retained and does nothing. It is called in ~40 `after` hooks, and a helper that makes its
 * callers change shape to adopt it does not get adopted.
 */
import http from 'node:http';
import { INSTANCES } from './helpers.js';

/**
 * A JSON-RPC caller over `POST /mcp`, shaped like the SSE session helper it replaced.
 *
 * `async` and returning a promise for symmetry with the old signature — every caller does
 * `await openMcpSession(...)`, and changing that would have been the one edit this migration was avoiding.
 */
export async function openMcpSession(authToken, instance = INSTANCES.a, timeoutMs = 15_000) {
  const parsed = new URL(instance);
  const host = parsed.hostname;
  const port = parseInt(parsed.port || '80', 10);
  let nextId = 1;

  function postJsonRpc(body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request({
        host, port, path: '/mcp', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          // Both are offered because the server chooses: a synchronous answer comes back as JSON, and one
          // that streams comes back as a single SSE frame. Accepting only JSON would make the test's
          // behaviour depend on which the server picked.
          Accept: 'application/json, text/event-stream',
          Authorization: `Bearer ${authToken}`,
        },
      }, (res) => {
        let txt = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { txt += c; });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            // The status rides on the error: a red-team case asserting 401 must not have to parse a message.
            reject(Object.assign(new Error(`POST /mcp failed: ${res.statusCode} ${txt}`), { statusCode: res.statusCode }));
            return;
          }
          const contentType = String(res.headers['content-type'] ?? '');
          try {
            if (contentType.includes('application/json')) { resolve(JSON.parse(txt)); return; }
            if (contentType.includes('text/event-stream')) {
              const frame = txt.split('\n\n').map(p => p.trim()).find(Boolean);
              if (!frame) throw new Error('empty SSE frame');
              const data = frame.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('\n');
              resolve(JSON.parse(data));
              return;
            }
            throw new Error(`unexpected content-type ${contentType}`);
          } catch (err) {
            reject(new Error(`POST /mcp gave an unreadable response: ${err instanceof Error ? err.message : String(err)} — ${txt}`));
          }
        });
      });
      req.setTimeout(timeoutMs, () => { req.destroy(new Error('MCP call timed out')); });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  async function callTool(name, args = {}) {
    const rpc = await postJsonRpc({ jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name, arguments: args } });
    return rpc?.result ?? rpc;
  }

  async function listTools() {
    const rpc = await postJsonRpc({ jsonrpc: '2.0', id: nextId++, method: 'tools/list', params: {} });
    return rpc?.result?.tools ?? rpc?.tools ?? [];
  }

  /** Nothing to close — kept so ~40 `after` hooks do not have to change. */
  function close() {}

  return { callTool, listTools, close, postJsonRpc };
}
