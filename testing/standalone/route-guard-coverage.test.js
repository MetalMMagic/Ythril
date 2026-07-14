/**
 * Standalone tests: every mutating route must carry an authorisation guard.
 *
 * This is the security twin of audit-route-coverage.test.js, and it exists because of a
 * question worth asking of any test: **what would still pass if the mechanism were removed?**
 *
 * Nothing in the suite would fail if `denyReadOnly` were dropped from a single route. The
 * red-team tests prove a read-only token is rejected on *some* endpoints — not on *every*
 * mutating endpoint — so a new route that forgot the guard would ship silently, and a
 * read-only token could write through it. Same for `requireSpaceAuth`: a route without it is
 * reachable by a token scoped to a different space.
 *
 * Per-route tests cannot close that: they enumerate what someone remembered to write. So this
 * derives the route list from the ROUTER SOURCE and asserts the guard is present on each — add
 * a mutating route without a guard and this fails, by name, until you either add the guard or
 * declare the route exempt WITH A REASON.
 *
 * It checks the middleware chain is *wired*, not that each guard's logic is correct — the
 * red-team suite covers the behaviour. The failure this catches is the one that actually
 * happens in practice: a guard that was simply never attached.
 *
 * Run: node --test testing/standalone/route-guard-coverage.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, '..', '..', 'server', 'src', 'api');
const APP_TS = path.join(__dirname, '..', '..', 'server', 'src', 'app.ts');

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

/** Any of these means "an authenticated identity is required to reach this route". */
const AUTH_GUARDS = [
  'requireSpaceAuth',
  'requireAuth',
  'requireAdminMfaScoped',
  'requireAdminMfa',
  'requireAdmin',
];

/** Guards that block a READ-ONLY token from writing. Admin guards imply a non-read-only admin. */
const WRITE_GUARDS = [
  'denyReadOnly',
  'requireAdminMfaScoped',
  'requireAdminMfa',
  'requireAdmin',
];

/**
 * Routes that legitimately carry no auth guard. Every entry needs a REASON — an exemption
 * without one is how a guard table rots (see the audit route table, which had drifted so far
 * that file uploads and the entire governance surface were unlogged).
 */
const EXEMPT = new Map([
  ['setupRouter', 'first-run setup — runs BEFORE any token exists; guarded by configExists()'],
  ['syncRouter', 'peer-to-peer sync — authenticated as a PEER via peer tokens, not user tokens'],
  ['inviteRouter', 'network invite handshake — authenticated by the invite key itself'],
  ['oidcRouter', 'OIDC login/callback — this is how you GET a token'],
  ['themeRouter', 'public unauthenticated theme endpoint (read-only, no user data)'],
  ['notifyRouter', 'peer notifications + admin sync trigger — peer-authenticated'],
  ['mcpRouter', 'MCP authorises at the tool dispatcher, not per-route'],
  ['metricsRouter', 'Prometheus scrape — guarded by METRICS_TOKEN inside the router'],
]);

/**
 * POSTs that are semantically READS (search/validate/dry-run). They must still require auth,
 * but must NOT be blocked for a read-only token — searching is exactly what read-only is for.
 */
const READ_SHAPED_POSTS = [
  '/spaces/:spaceId/query',
  '/spaces/:spaceId/recall',
  '/spaces/:spaceId/find-similar',
  '/spaces/:spaceId/traverse',
  '/recall',
  '/:id/validate-schema',
  '/export-space',
  '/config/test',
];

/** @type {{router:string, method:string, routePath:string, chain:string, file:string}[]} */
let routes = [];
/** Guards applied to an ENTIRE router via `xRouter.use(...)` — they cover every route on it. */
let routerLevelGuards = new Map();

function mountedRouters() {
  const src = fs.readFileSync(APP_TS, 'utf8');
  const names = new Set();
  const re = /app\.use\(\s*'[^']+'\s*,\s*([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(src)) !== null) names.add(m[1]);
  return names;
}

describe('Route guards — every mutating route must be protected', () => {
  before(() => {
    const mounted = mountedRouters();

    for (const file of fs.readdirSync(API_DIR).filter(f => f.endsWith('.ts'))) {
      const src = fs.readFileSync(path.join(API_DIR, file), 'utf8');

      // Router-level guards must count, or this reports false positives: webhooksRouter does
      // `webhooksRouter.use(globalRateLimit, requireAdminMfa)` and then registers bare routes.
      const useRe = /(\w+Router)\s*\.\s*use\s*\(([^)]*)\)/g;
      let u;
      while ((u = useRe.exec(src)) !== null) {
        const prev = routerLevelGuards.get(u[1]) ?? '';
        routerLevelGuards.set(u[1], prev + ',' + u[2]);
      }

      // Capture the middleware chain: everything between the path string and the handler.
      // Handles both single-line and the multi-line registration style used in files.ts.
      const re = /(\w+Router)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*'([^']+)'\s*,([\s\S]{0,400}?)(?:async\s*\(|\(\s*req\b)/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const [, router, method, routePath, chain] = m;
        if (!mounted.has(router)) continue;
        routes.push({ router, method, routePath, chain, file });
      }
    }
  });

  it('the parser found the routes (guard the guard — it must not pass vacuously)', () => {
    // If the registration style changes and the regex stops matching, every assertion below
    // would pass on an EMPTY list. That is the exact failure mode this whole test exists to
    // prevent, so it must not be possible here either.
    assert.ok(routes.length > 50, `expected to parse many routes, found ${routes.length}`);

    const mutating = routes.filter(r => MUTATING.has(r.method));
    assert.ok(mutating.length > 30, `expected many mutating routes, found ${mutating.length}`);

    const sample = routes.find(r => r.router === 'brainRouter' && r.routePath === '/spaces/:spaceId/memories' && r.method === 'post');
    assert.ok(sample, 'sanity: POST /spaces/:spaceId/memories should have been parsed');
    assert.match(sample.chain, /requireSpaceAuth/, 'sanity: its chain should contain requireSpaceAuth');
  });

  /** A route is protected by its own chain OR by a guard its router applies to everything. */
  function effectiveChain(r) {
    return r.chain + (routerLevelGuards.get(r.router) ?? '');
  }

  it('every mutating route requires an authenticated identity', () => {
    const unguarded = [];
    for (const r of routes) {
      if (!MUTATING.has(r.method)) continue;
      if (EXEMPT.has(r.router)) continue;
      if (!AUTH_GUARDS.some(g => effectiveChain(r).includes(g))) {
        unguarded.push(`${r.method.toUpperCase()} ${r.routePath}  (${r.file}: ${r.router})`);
      }
    }
    assert.deepEqual(
      unguarded, [],
      'These mutating routes have NO auth guard — they are reachable without a valid identity. ' +
      'Add one, or add an EXEMPT entry WITH A REASON:\n  ' + unguarded.join('\n  '),
    );
  });

  it('every mutating route blocks a READ-ONLY token', () => {
    // The guard that is easiest to forget, and whose absence no existing test would catch:
    // the red-team suite proves a read-only token is rejected on SOME endpoints, never on ALL.
    const writable = [];
    for (const r of routes) {
      if (!MUTATING.has(r.method)) continue;
      if (EXEMPT.has(r.router)) continue;
      if (r.method === 'post' && READ_SHAPED_POSTS.includes(r.routePath)) continue;
      if (!WRITE_GUARDS.some(g => effectiveChain(r).includes(g))) {
        writable.push(`${r.method.toUpperCase()} ${r.routePath}  (${r.file}: ${r.router})`);
      }
    }
    assert.deepEqual(
      writable, [],
      'These mutating routes do NOT block a read-only token — a read-only credential could ' +
      'write through them. Add denyReadOnly (or an admin guard), or EXEMPT it with a reason:\n  ' +
      writable.join('\n  '),
    );
  });

  it('space-scoped routes enforce the space scope', () => {
    // A `:spaceId` route without requireSpaceAuth is reachable by a token scoped to a
    // DIFFERENT space — a cross-tenant read/write, not merely a missing login check.
    const unscoped = [];
    for (const r of routes) {
      if (EXEMPT.has(r.router)) continue;
      if (!/:spaceId\b/.test(r.routePath)) continue;
      // Admin-scoped guards carry the space check themselves.
      const chain = effectiveChain(r);
      if (chain.includes('requireSpaceAuth') || chain.includes('requireAdminMfaScoped')) continue;
      if (chain.includes('requireAdmin')) continue; // full admin — not space-scoped by design
      unscoped.push(`${r.method.toUpperCase()} ${r.routePath}  (${r.file}: ${r.router})`);
    }
    assert.deepEqual(
      unscoped, [],
      'These :spaceId routes do not enforce the space scope — a token scoped to another space ' +
      'could reach them:\n  ' + unscoped.join('\n  '),
    );
  });
});
