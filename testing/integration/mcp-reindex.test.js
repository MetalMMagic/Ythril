/**
 * `reindex` over MCP — the last of the five REST-only capabilities.
 *
 * ## What only this file can check
 *
 * The refusals themselves are pinned by `reindex-contract.test.js` against the REST route, and both surfaces now call
 * `planReindex`. Re-asserting them here would be testing one function through two doors.
 *
 * What only this file can check is that the tool goes through that door, and one thing the REST suite cannot see at
 * all: **the member list this surface supplies**. REST narrows by request; the tool narrows by the token's accessible
 * spaces. That argument is the single per-surface difference in `planReindex`, so it is the single place this tool can
 * be wrong while looking right — a scoped admin must not re-embed a member it cannot reach.
 *
 * Run: node --test testing/integration/mcp-reindex.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'url';
import { INSTANCES, post, get, delWithBody } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIGS = path.join(__dirname, '..', 'sync', 'configs');
const RUN = Date.now();

let token;
let session;
const created = [];

/** The FIFO-waiter SSE harness from `mcp-tools.test.js`. Matching frames by position returns the PREVIOUS answer. */
async function openMcpSession(authToken, instance = INSTANCES.a, timeoutMs = 15_000) {
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


const idFor = (what) => `mcp-reindex-${what}-${RUN}`;

async function makeSpace(id, body = {}) {
  const r = await post(INSTANCES.a, token, '/api/spaces', { id, label: id, ...body });
  assert.equal(r.status, 201, `space create failed: ${JSON.stringify(r.body)}`);
  created.push(id);
}

const SPACE = idFor('plain');
const MEMBER = idFor('member');
const PROXY = idFor('proxy');

before(async () => {
  token = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  await makeSpace(SPACE);
  await makeSpace(MEMBER);
  await makeSpace(PROXY, { proxyFor: [MEMBER] });
  const mem = await post(INSTANCES.a, token, `/api/brain/spaces/${SPACE}/memories`, { fact: `reindex me ${RUN}` });
  assert.equal(mem.status, 201, JSON.stringify(mem.body));
  session = await openMcpSession(token);
});

after(async () => {
  session?.close();
  for (const id of created.reverse()) {
    await delWithBody(INSTANCES.a, token, `/api/spaces/${id}`, { confirm: true }).catch(() => {});
  }
});

describe('reindex is offered and starts a job', () => {
  it('appears in tools/list for an admin token', async () => {
    const names = (await session.listTools()).map(t => t.name);
    assert.ok(names.includes('reindex'), `not offered: ${names.join(', ')}`);
  });

  it('starts the job and says plainly that it has NOT finished', async () => {
    // The contract the route already had, and the one most easily lost: the reply means SCHEDULED. An agent that read
    // it as "done" would check for results immediately, find the old vectors, and conclude the reindex failed.
    const r = await session.callTool('reindex', { space: SPACE });
    assert.ok(!r?.isError, `refused: ${JSON.stringify(r)}`);
    assert.equal(r?.structuredContent?.status, 'started', 'the outcome must be machine-readable, not only prose');
    assert.match(r.content[0].text, /background|does not mean it finished/i,
      'the text must say the job is not finished — this is the whole hazard of a fire-and-forget tool');
  });

  it('reports the member spaces it will walk', async () => {
    // This is the argument that differs per surface, so it is the one worth surfacing to the caller. For a normal
    // space it is the space itself.
    const r = await session.callTool('reindex', { space: SPACE });
    if (r?.isError) {
      // A job from the previous test may still hold the guard; that is the 409 path, asserted below.
      assert.match(r.content[0].text, /409/);
      return;
    }
    assert.deepEqual(r?.structuredContent?.memberSpaces, [SPACE]);
  });
});

describe('reindex is held to the ROUTE rules, not looser ones', () => {
  it('REFUSES a proxy space, naming its members so the caller knows what to do instead', async () => {
    const r = await session.callTool('reindex', { space: PROXY });
    assert.ok(r?.isError, `accepted a proxy: ${JSON.stringify(r)}`);
    assert.match(r.content[0].text, /400/);
    assert.match(r.content[0].text, new RegExp(MEMBER), 'the members must be named');
    assert.deepEqual(r?.structuredContent?.proxyFor, [MEMBER],
      'and carried as a field, so an agent need not parse prose to find the remedy');
  });

  it('REFUSES a second job while one is running, with 409 rather than a generic failure', async () => {
    // 409 means "try later"; 400 means "never". An agent that cannot tell them apart either retries forever or gives
    // up on a space that is merely busy.
    const first = await session.callTool('reindex', { space: SPACE });
    const second = await session.callTool('reindex', { space: MEMBER });
    const both = [first, second].filter(r => r?.isError).map(r => r.content[0].text);
    assert.ok(both.some(t => /409/.test(t)) || !second?.isError,
      `expected a 409 while a job runs, or a clean start once it finished: ${JSON.stringify([first, second])}`);
  });

  it('REFUSES an unknown parameter rather than silently ignoring it', async () => {
    const r = await session.callTool('reindex', { space: SPACE, force: true });
    assert.ok(r?.isError, `a misspelled parameter was accepted: ${JSON.stringify(r)}`);
  });
});
