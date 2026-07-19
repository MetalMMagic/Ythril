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
const PEER_AUTH_REASON = 'peer-to-peer sync — authenticated as a PEER via peer tokens, not user tokens';
const EXEMPT = new Map([
  ['setupRouter', 'first-run setup — runs BEFORE any token exists; guarded by configExists()'],
  // The /api/sync surface was one `syncRouter` until A17.6 split it into per-concern sub-routers.
  // The exemption is about HOW the surface authenticates (peer tokens), so it follows every
  // sub-router — otherwise the split would silently re-flag the whole peer protocol.
  ['syncRouter', PEER_AUTH_REASON],
  ['syncDocsRouter', PEER_AUTH_REASON],
  ['syncTombstonesRouter', PEER_AUTH_REASON],
  ['syncManifestRouter', PEER_AUTH_REASON],
  ['syncMembersRouter', PEER_AUTH_REASON],
  ['syncVotesRouter', PEER_AUTH_REASON],
  ['syncWarmRouter', PEER_AUTH_REASON],
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
  // Minting a single-use ticket to WATCH the live-events stream is a read (the stream itself allows
  // read-only tokens — "watching is a read"), so it must not be blocked for a read-only token.
  '/spaces/:spaceId/events/ticket',
  '/recall',
  '/:id/validate-schema',
  '/export-space',
  '/config/test',
];

/** @type {{router:string, method:string, routePath:string, chain:string, file:string}[]} */
let routes = [];
/** Guards applied to an ENTIRE router via `xRouter.use(...)` — they cover every route on it. */
let routerLevelGuards = new Map();

/** Every .ts file under the api dir, recursively — routes live in `api/` AND `api/brain/` (A17.3). */
function apiFiles(dir = API_DIR, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) apiFiles(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function mountedRouters() {
  const src = fs.readFileSync(APP_TS, 'utf8');
  const names = new Set();
  const re = /app\.use\(\s*'[^']+'\s*,\s*([A-Za-z_]\w*)/g;
  let m;
  while ((m = re.exec(src)) !== null) names.add(m[1]);

  // A sub-router mounted on a mounted parent is itself reachable — api/brain/index.ts does
  // `brainRouter.use(memoriesRouter)`. Without this every brain route would drop out of the guard
  // check and it would pass on a short list.
  const links = [];
  for (const f of apiFiles()) {
    const s = fs.readFileSync(f, 'utf8');
    const childRe = /(\w+Router)\s*\.\s*use\(\s*(\w+Router)\s*\)/g;
    let c;
    while ((c = childRe.exec(s)) !== null) links.push([c[1], c[2]]);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const [parent, child] of links) {
      if (names.has(parent) && !names.has(child)) { names.add(child); changed = true; }
    }
  }
  return names;
}

describe('Route guards — every mutating route must be protected', () => {
  before(() => {
    const mounted = mountedRouters();

    for (const filePath of apiFiles()) {
      const file = path.relative(API_DIR, filePath).replace(/\\/g, '/');
      const src = fs.readFileSync(filePath, 'utf8');

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

  it('router variable names are unique across the api tree (name-keyed analysis must be sound)', () => {
    // Both this guard and audit-route-coverage map `xRouter` -> mount prefix BY NAME. Two modules
    // exporting the same name silently give one of them the other's prefix, so its routes get
    // checked against the wrong rules — or vanish from the check entirely.
    //
    // This has bitten twice for real. A17.3: api/brain's file-metadata router was a second
    // `filesRouter` (api/files.ts already had one), so its routes resolved to /api/files. A17.6:
    // api/sync's `membersRouter`/`votesRouter` collided with api/networks', so the peer routes
    // resolved to /api/networks and reported as unaudited. Both compiled and ran fine — only this
    // analysis noticed. Assert uniqueness so the next split can't reintroduce it.
    const owners = new Map();
    for (const filePath of apiFiles()) {
      const src = fs.readFileSync(filePath, 'utf8');
      const re = /^export const (\w+Router)\s*=/gm;
      let m;
      while ((m = re.exec(src)) !== null) {
        const rel = path.relative(API_DIR, filePath).replace(/\\/g, '/');
        if (!owners.has(m[1])) owners.set(m[1], []);
        owners.get(m[1]).push(rel);
      }
    }
    const dupes = [...owners.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => `${name} declared in: ${files.join(', ')}`);
    assert.deepEqual(dupes, [], `router names must be unique across server/src/api:\n  ${dupes.join('\n  ')}`);
  });

  it('the parser found the routes (guard the guard — it must not pass vacuously)', () => {
    // If the registration style changes and the regex stops matching, every assertion below
    // would pass on an EMPTY list. That is the exact failure mode this whole test exists to
    // prevent, so it must not be possible here either.
    assert.ok(routes.length > 50, `expected to parse many routes, found ${routes.length}`);

    const mutating = routes.filter(r => MUTATING.has(r.method));
    assert.ok(mutating.length > 30, `expected many mutating routes, found ${mutating.length}`);

    // Brain routes live on per-resource sub-routers since A17.3 (memoriesRouter et al, mounted on
    // brainRouter in api/brain/index.ts) — same URL, same chain, different router variable.
    const sample = routes.find(r => r.router === 'memoriesRouter' && r.routePath === '/spaces/:spaceId/memories' && r.method === 'post');
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
