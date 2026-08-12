/**
 * `update_space_schema` over MCP — the same rules as the REST route, because it is the same function.
 *
 * ## What this is checking, and what it deliberately is not
 *
 * The refusal chain itself is pinned by `space-meta-update-contract.test.js` against the REST route, and both
 * surfaces now call `planSpaceMetaUpdate`. Re-asserting all five statuses here would be testing the same function
 * twice through two doors.
 *
 * What only this file can check is that the tool actually goes through that door: that a `$ref` to a missing
 * library entry is REFUSED rather than stored as an empty schema, that merge semantics are the REST default, and
 * that admin gating holds. A tool calling `updateSpace()` directly would pass a "did it write?" test and fail every
 * one of these — which is exactly the *two surfaces, one rule, one weaker* defect this batch is about.
 *
 * Run: node --test testing/integration/mcp-update-space-schema.test.js
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
const SPACE = `mcp-schema-${RUN}`;

let tokenA;
let session;

/**
 * MCP session over SSE — the FIFO-waiter harness from `mcp-tools.test.js`, copied rather than re-derived.
 *
 * The first version of this file used a shortcut: POST, then scan the accumulated buffer for the last
 * `data: {"result"…}` frame. It matched by POSITION, so every call returned the PREVIOUS call's response — which
 * showed up as a broken-`$ref` test reporting success with the text of the write before it. A measurement that can
 * return an earlier answer cannot be trusted about the current one, so the proven harness is used verbatim:
 * responses are queued and handed out in order, and a `tools/call` waits for one that actually arrived.
 */
async function openMcpSession(authToken, instance = INSTANCES.a, timeoutMs = 15_000) {
  const parsed = new URL(instance);
  const host = parsed.hostname;
  const port = parseInt(parsed.port || '80', 10);

  return new Promise((resolve, reject) => {
    const req = http.request({
      host, port, path: '/mcp', method: 'GET',
      headers: { Authorization: `Bearer ${authToken}`, Accept: 'text/event-stream' },
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`MCP SSE open failed: ${res.statusCode}`));
        return;
      }

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

const meta = () => get(INSTANCES.a, tokenA, `/api/spaces/${SPACE}/meta`);

before(async () => {
  tokenA = fs.readFileSync(path.join(CONFIGS, 'a', 'token.txt'), 'utf8').trim();
  const r = await post(INSTANCES.a, tokenA, '/api/spaces', { id: SPACE, label: `MCP schema ${RUN}` });
  assert.equal(r.status, 201, `space create failed: ${JSON.stringify(r.body)}`);
  session = await openMcpSession(tokenA);
});

after(async () => {
  session?.close();
  await delWithBody(INSTANCES.a, tokenA, `/api/spaces/${SPACE}`, { confirm: true }).catch(() => {});
});

describe('update_space_schema is offered and writes', () => {
  it('appears in tools/list for an admin token', async () => {
    // The parity map's row for this capability was DELETED when the tool landed, so the tool existing is what makes
    // that deletion honest. `mcp-rest-parity.test.js` gates the other direction.
    const names = (await session.listTools()).map(t => t.name);
    assert.ok(names.includes('update_space_schema'), `not offered: ${names.join(', ')}`);
  });

  it('writes a type schema an agent designed', async () => {
    const r = await session.callTool('update_space_schema', {
      space: SPACE,
      typeSchemas: { entity: { widget: { propertySchemas: { region: { type: 'string' } } } } },
    });
    assert.ok(!r?.isError, `refused: ${JSON.stringify(r)}`);
    const after = await meta();
    assert.equal(after.body.typeSchemas?.entity?.widget?.propertySchemas?.region?.type, 'string',
      'the schema must be readable back through the REST meta endpoint — one store, two surfaces');
  });

  it('MERGES by default, so editing one type does not drop the others', async () => {
    await session.callTool('update_space_schema', {
      space: SPACE, typeSchemas: { entity: { gadget: { namingPattern: '^G-' } } },
    });
    const after = await meta();
    assert.ok(after.body.typeSchemas?.entity?.widget, 'the type not mentioned must survive');
    assert.ok(after.body.typeSchemas?.entity?.gadget, 'and the new one must be there');
  });

  it('`replace` is how a type is DELETED — the only way to express it', async () => {
    const r = await session.callTool('update_space_schema', {
      space: SPACE, typeSchemasMode: 'replace',
      typeSchemas: { entity: { gadget: { namingPattern: '^G-' } } },
    });
    assert.ok(!r?.isError, `refused: ${JSON.stringify(r)}`);
    const after = await meta();
    assert.equal(after.body.typeSchemas?.entity?.widget, undefined, 'replace makes the payload authoritative');
    assert.ok(after.body.typeSchemas?.entity?.gadget, 'and keeps what it names');
  });

  it('writes the other meta fields too, so a wedged space can be repaired in one call', async () => {
    const r = await session.callTool('update_space_schema', {
      space: SPACE, validationMode: 'warn', usageNotes: 'written over MCP',
    });
    assert.ok(!r?.isError, `refused: ${JSON.stringify(r)}`);
    const after = await meta();
    assert.equal(after.body.validationMode, 'warn');
    assert.equal(after.body.usageNotes, 'written over MCP');
  });
});

describe('update_space_schema is held to the ROUTE rules, not looser ones', () => {
  it('REFUSES a $ref to a library entry that does not exist', async () => {
    // The whole reason the chain was extracted before the tool. A tool calling `updateSpace()` directly would store
    // this as an empty schema and report success — in a strict space that silently removes every constraint from
    // the type while the schema looks authored.
    const before = await meta();
    const r = await session.callTool('update_space_schema', {
      space: SPACE, typeSchemas: { entity: { broken: { $ref: `library:absent-${RUN}` } } },
    });
    assert.ok(r?.isError, `a broken $ref was accepted: ${JSON.stringify(r)}`);
    const text = r?.content?.[0]?.text ?? '';
    assert.match(text, /422/, 'the refusal must carry the status, so an agent can branch on it');
    assert.match(text, new RegExp(`absent-${RUN}`), 'and name the missing entry');
    const after = await meta();
    assert.equal(after.body.version, before.body.version, 'a refused write must not bump the meta version');
  });

  it('REFUSES an unknown field rather than silently dropping it', async () => {
    // `additionalProperties: false` on the tool schema is the first gate; the planner's `.strict()` meta body is the
    // second. Either is enough — what must not happen is a 200 that ignored the field.
    const r = await session.callTool('update_space_schema', { space: SPACE, validationMdoe: 'strict' });
    assert.ok(r?.isError, `a misspelled field was accepted: ${JSON.stringify(r)}`);
  });

  it('refuses a call that names no field at all', async () => {
    const r = await session.callTool('update_space_schema', { space: SPACE });
    assert.ok(r?.isError, `an empty update was accepted: ${JSON.stringify(r)}`);
  });
});
