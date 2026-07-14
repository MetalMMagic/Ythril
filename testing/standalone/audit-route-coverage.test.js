/**
 * Standalone tests: every mutating route must resolve to an audit operation.
 *
 * The audit middleware keeps a hand-maintained ROUTE_RULES table — a second, shadow copy of
 * the router's path table. Nothing kept the two in sync, and they had drifted badly:
 *
 *   - `POST /api/files/:space/upload` — a route that has NEVER existed. The real upload is
 *     `POST /api/files/:spaceId?path=…`, so the rule matched nothing and every file upload
 *     was silently unlogged.
 *   - the DELETE/PATCH file rules required a trailing slash after the space segment, but the
 *     real routes carry the path in the QUERY STRING (which the middleware strips before
 *     matching) — so file deletes and moves were unlogged too.
 *   - `PATCH /api/spaces/:id/rename` was not matched by the anchored `…/([^/]+)$` rule, so
 *     SPACE RENAMES were unaudited — the one operation that, done wrong, hides a space's data.
 *   - there was no PUT rule at all, so every schema write was unaudited.
 *
 * None of it was caught because the audit tests only ever asserted `memory.create`,
 * `token.create`/`token.delete` and `auth.failed` — the handful of rules that happened to be
 * correct. Same trap as every other bug in this class: coverage that exercises only the cases
 * that cannot fail.
 *
 * This test derives the route list from the ROUTER SOURCE rather than restating it, so the
 * shadow table can no longer drift silently: add a mutating route, and this fails until it is
 * either audited or explicitly declared exempt.
 *
 * Run: node --test testing/standalone/audit-route-coverage.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, '..', '..', 'server', 'src', 'api');
const APP_TS = path.join(__dirname, '..', '..', 'server', 'src', 'app.ts');

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Routes that intentionally produce no audit entry. Each needs a REASON — an exemption
 * without one is how the table rots.
 */
const EXEMPT = new Map([
  // Machine-to-machine sync: peers write constantly and are authenticated as peers, not
  // users. Auditing every sync push would swamp the log and tell you nothing about a human.
  ['/api/sync', 'peer-to-peer sync traffic — not a user action'],
  ['/api/notify', 'peer notifications + the admin sync trigger — not a data mutation'],
  // First-run setup happens before any token exists, so there is nobody to attribute it to.
  ['/api/setup', 'first-run setup — runs before any identity exists'],
  // Auth/session endpoints have their own dedicated audit events (auth.failed, token.*).
  ['/api/mfa', 'MFA enrolment/verification — covered by its own auth events'],
  ['/api/oidc', 'OIDC login callbacks — covered by auth events'],
  ['/api/invite', 'network invite handshake — peer-facing'],
  ['/api/local-agent', 'workstation connector handshake — not a brain mutation'],
  ['/api/theme', 'public, unauthenticated theme endpoint'],
  ['/api/metrics', 'Prometheus scrape endpoint'],
  ['/mcp', 'MCP has its own tool-level audit path'],
]);

let resolveOperation;
/** @type {{method: string, routerPath: string, fullPath: string, file: string}[]} */
let routes = [];

/** Map `xxxRouter` -> its mount prefix, read from app.ts (`app.use('/api/xxx', xxxRouter)`). */
function readMounts() {
  const src = fs.readFileSync(APP_TS, 'utf8');
  const mounts = new Map();
  const re = /app\.use\(\s*'([^']+)'\s*,\s*([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(src)) !== null) mounts.set(m[2], m[1]);
  return mounts;
}

/** Substitute `:param` segments with a concrete sample so the rule regexes can be tested. */
function concretise(p) {
  return p.replace(/:([A-Za-z_]\w*)/g, 'sample');
}

describe('Audit coverage — every mutating route must resolve to an operation', () => {
  before(async () => {
    ({ resolveOperation } = await import('../../server/dist/audit/middleware.js'));

    const mounts = readMounts();
    for (const file of fs.readdirSync(API_DIR).filter(f => f.endsWith('.ts'))) {
      const src = fs.readFileSync(path.join(API_DIR, file), 'utf8');
      // e.g.  brainRouter.post('/spaces/:spaceId/memories', ...)   (also multi-line)
      const re = /(\w+Router)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*'([^']+)'/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const [, routerName, method, routerPath] = m;
        const prefix = mounts.get(routerName);
        if (!prefix) continue; // router not mounted in app.ts (e.g. built dynamically)
        const joined = (prefix + (routerPath === '/' ? '' : routerPath)).replace(/\/+/g, '/');
        routes.push({
          method: method.toUpperCase(),
          routerPath,
          fullPath: concretise(joined),
          file,
        });
      }
    }
  });

  it('discovers a plausible number of routes (the parser itself must not silently break)', () => {
    // If the regex stops matching (a refactor to a different registration style), every
    // assertion below would vacuously pass. Guard the guard.
    assert.ok(routes.length > 50, `expected to discover many routes, found ${routes.length}`);
    assert.ok(
      routes.some(r => r.fullPath === '/api/brain/spaces/sample/memories' && r.method === 'POST'),
      'sanity: POST /api/brain/spaces/:spaceId/memories should have been discovered',
    );
  });

  it('every mutating route is audited (or explicitly exempt)', () => {
    const unaudited = [];
    for (const r of routes) {
      if (!MUTATING.has(r.method)) continue;
      if ([...EXEMPT.keys()].some(prefix => r.fullPath.startsWith(prefix))) continue;

      // A rule flagged `read: true` is a deliberate classification (search endpoints are
      // POSTs but do not mutate), so it counts as covered. What must never happen is a
      // mutating route with NO rule at all — that is the silent drift.
      const hit = resolveOperation(r.method, r.fullPath);
      if (!hit) {
        unaudited.push(`${r.method} ${r.fullPath}  (${r.file})`);
      }
    }

    assert.deepEqual(
      unaudited, [],
      'These mutating routes produce NO audit entry. Either add a rule to ROUTE_RULES in ' +
      'server/src/audit/middleware.ts, or add an EXEMPT entry here WITH A REASON:\n  ' +
      unaudited.join('\n  '),
    );
  });

  it('the specific routes that had drifted are now audited', () => {
    // Pin the exact regressions, so a future "cleanup" of the rules cannot quietly undo them.
    const mustAudit = [
      ['POST', '/api/files/sample', 'file upload'],
      ['DELETE', '/api/files/sample', 'file delete'],
      ['PATCH', '/api/files/sample', 'file move/rename'],
      ['PATCH', '/api/spaces/sample/rename', 'space rename'],
      ['PUT', '/api/spaces/sample/schema', 'space schema write'],
      ['POST', '/api/spaces/reorder', 'space reorder'],
      ['DELETE', '/api/brain/spaces/sample/files', 'file metadata delete'],
    ];
    for (const [method, p, what] of mustAudit) {
      const hit = resolveOperation(method, p);
      assert.ok(hit && !hit.read, `${what} (${method} ${p}) must produce an audit entry`);
    }
  });

  it('a space rename is recorded as space.rename, not swallowed by space.update', () => {
    // Rule order matters: the generic `/api/spaces/:id` PATCH rule would otherwise shadow it.
    const hit = resolveOperation('PATCH', '/api/spaces/my-space/rename');
    assert.equal(hit?.operation, 'space.rename');
    assert.equal(hit?.spaceId, 'my-space');
  });
});
