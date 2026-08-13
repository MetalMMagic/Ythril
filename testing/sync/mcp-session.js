/**
 * One MCP SSE session helper, shared.
 *
 * The FIFO-waiter harness below was copy-pasted into TEN test files before this module existed (`mcp-tools`, `mcp`,
 * `mcp-reindex`, `mcp-create-space`, `mcp-update-space-schema`, `dupe-detection`, `proxy-spaces`, `recall-filter`,
 * `recall-traverse`, and the red-team `mcp-security`). Ten copies of a transport harness is ten places a protocol change
 * has to be found, and the copy that gets missed is the one whose suite starts timing out for reasons that look like the
 * server's fault.
 *
 * New MCP tests import this. Migrating the existing ten is a mechanical follow-up, deliberately not folded into the
 * feature PR that needed the eleventh copy.
 *
 * ## Why FIFO waiters and not frame matching
 *
 * Matching response frames by POSITION returns the PREVIOUS answer, which makes a test pass while asserting on the wrong
 * call. Requests are queued in order and each reply is handed to the oldest waiter.
 */
import http from 'node:http';
import { INSTANCES } from './helpers.js';

/** Open an SSE session and return `{callTool, listTools, close}`. */
export async function openMcpSession(authToken, instance = INSTANCES.a, timeoutMs = 15_000) {
  const parsed = new URL(instance);
  const host = parsed.hostname;
  const port = parseInt(parsed.port || '80', 10);

  return new Promise((resolve, reject) => {
    const req = http.request({
      host, port, path: '/mcp', method: 'GET',
      headers: { Authorization: `Bearer ${authToken}`, Accept: 'text/event-stream' },
    }, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`MCP SSE open failed: ${res.statusCode}`)); return; }

      let buffer = '';
      let sessionId = null;
      const pendingMessages = [];
      const waiters = [];

      res.setEncoding('utf8');
      res.on('data', chunk => {
        buffer += chunk;
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
          if (!part.trim()) continue;
          let eventType = 'message';
          let data = '';
          for (const line of part.split('\n')) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) data = line.slice(5).trim();
          }
          if (eventType === 'endpoint') {
            const m = data.match(/sessionId=([^&\s]+)/);
            if (m) sessionId = m[1];
          } else if (eventType === 'message' && data) {
            try {
              const msg = JSON.parse(data);
              const waiter = waiters.shift();
              if (waiter) waiter(msg);
              else pendingMessages.push(msg);
            } catch { /* non-JSON frame */ }
          }
        }
      });
      res.on('error', reject);

      const deadline = Date.now() + timeoutMs;
      const poll = setInterval(() => {
        if (sessionId) { clearInterval(poll); resolve({ callTool, listTools, close }); }
        else if (Date.now() > deadline) { clearInterval(poll); reject(new Error('MCP session did not receive endpoint event')); }
      }, 50);

      async function postJsonRpc(body) {
        return new Promise((res2, rej2) => {
          const waiterTimeout = setTimeout(() => rej2(new Error('MCP tool call timed out')), timeoutMs);
          if (pendingMessages.length > 0) { clearTimeout(waiterTimeout); res2(pendingMessages.shift()); return; }
          waiters.push(msg => { clearTimeout(waiterTimeout); res2(msg); });

          const postData = JSON.stringify(body);
          const pr = http.request({
            host, port, path: `/mcp/messages?sessionId=${sessionId}`, method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              Authorization: `Bearer ${authToken}`,
            },
          }, pres => {
            let txt = '';
            pres.setEncoding('utf8');
            pres.on('data', c => { txt += c; });
            pres.on('end', () => {
              if (pres.statusCode !== 202 && pres.statusCode !== 200) {
                clearTimeout(waiterTimeout);
                rej2(new Error(`MCP POST failed: ${pres.statusCode} ${txt}`));
              }
            });
          });
          pr.on('error', rej2);
          pr.write(postData);
          pr.end();
        });
      }

      async function callTool(name, args = {}) {
        const rpc = await postJsonRpc({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } });
        return rpc?.result ?? rpc;
      }
      async function listTools() {
        const rpc = await postJsonRpc({ jsonrpc: '2.0', id: Date.now(), method: 'tools/list', params: {} });
        return rpc?.result?.tools ?? rpc?.tools ?? [];
      }
      function close() { req.destroy(); }
    });
    req.on('error', reject);
    req.end();
  });
}

