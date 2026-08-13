/**
 * Audit the surface matrix against RUNNING code, not against the regex that produced it.
 *
 * `surface-matrix.mjs` finds routes by scanning source for `router.verb('path')`. That is a heuristic, and a
 * heuristic is exactly what should not be trusted when the answer is "this table is complete". So this script
 * builds the Express app in process and walks its router stack — the same object the server dispatches on — and
 * compares the two sets in both directions.
 *
 * Three independent claims, each checked against a runtime source of truth:
 *
 * 1. **Route completeness.** Every route Express actually serves appears in the static extraction, and every
 *    route the extraction claims is one Express actually serves. A miss in either direction is a real bug in
 *    the table: the first hides a route, the second invents one.
 * 2. **Tool completeness.** Every name in `ALL_TOOLS` appears in the hand-written map. Already enforced by the
 *    generator, re-checked here so the audit stands alone.
 * 3. **Mapping soundness.** For each mapped pair, the tool handler and the route handler must reach the same
 *    underlying module — a shared function, not two implementations. Verified by comparing the imports each
 *    side pulls from `brain/`, `files/` and `spaces/`; a pair with no shared module is reported for a human to
 *    look at rather than silently blessed.
 *
 * Exit code is non-zero when any claim fails, so this can gate.
 *
 * Run: node scripts/surface-matrix-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = p => readFileSync(join(ROOT, p), 'utf8');
/**
 * Comments out, LINE comments first.
 *
 * Order is not cosmetic. `api/data.ts:281` reads `// Follow the symlink — useful for /mnt/* or volume-mount
 * points`, and stripping block comments first treats that `/*` as an opener: it swallows 5,907 characters
 * through the next `*​/`, taking three route registrations with it. That is how this matrix reported 202 routes
 * when the routers serve 207. Removing line comments first makes the phantom opener disappear with its line.
 *
 * Two files in the tree hit it today (`api/data.ts`, `files/converters/pipeline.ts`), and 33 gates still carry
 * the other order — tracked as its own item rather than swept here.
 */
const strip = s => s.replace(/(^|[^:])\/\/.*/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

const problems = [];
const note = m => problems.push(m);

// ── 1 · what the STATIC extractor sees (the matrix's own method) ─────────────
const APP = strip(read('server/src/app.ts'));
const routerFile = new Map();
for (const m of APP.matchAll(/import \{ (\w+) \} from '\.\/(api\/[^']+)\.js'/g)) routerFile.set(m[1], `server/src/${m[2]}.ts`);
const mounts = [];
for (const m of APP.matchAll(/app\.use\('(\/[^']*)',\s*(\w+)\)/g)) {
  const file = routerFile.get(m[2]);
  if (file) mounts.push({ mount: m[1], file });
}
const filesFor = file => {
  if (!file.endsWith('/index.ts')) return [file];
  const dir = file.slice(0, -'/index.ts'.length);
  return execFileSync('git', ['ls-files', dir], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(l => l.trim()).filter(l => l.endsWith('.ts'));
};
/**
 * Every route, attributed by the ROUTER IDENTIFIER rather than by which file it sits in.
 *
 * `POST /api/spaces/:id/reembed` is registered in `api/spaces-reembed.ts` by a function that takes the router
 * as a parameter — `registerReembedRoute(spacesRouter)` — so scanning only the router's own file missed it, and
 * `activity/reset` the same way. The parameter is named after the router, which is what makes identifier
 * attribution work: `spacesRouter.post('/:id/reembed', …)` maps to the `/api/spaces` mount wherever it lives.
 */
const API_ALL = execFileSync('git', ['ls-files', 'server/src/api'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map(l => l.trim()).filter(l => l.endsWith('.ts'));

/**
 * Router identifier -> mount path, following `use()` chains.
 *
 * `app.use('/api/brain', brainRouter)` is only the first hop: `brainRouter.use(memoriesRouter)` and seven
 * siblings sit inside `api/brain/index.ts`, each with no prefix, so their routes are served under `/api/brain`
 * while nothing in `app.ts` names them. Stopping at the first hop attributed 115 of 207 routes and called the
 * other 92 unattributed.
 *
 * A PREFIXED nesting (`x.use('/y', sub)`) would need the prefix carried; none exists, and the loop reports one
 * loudly if it appears rather than quietly mis-attributing its routes.
 */
const mountFor = new Map();
for (const m of APP.matchAll(/app\.use\('(\/[^']*)',\s*(\w+)\)/g)) mountFor.set(m[2], m[1]);

const nestings = [];
for (const f of API_ALL) {
  let code;
  try { code = strip(read(f)); } catch { continue; }
  for (const m of code.matchAll(/\b(\w*[Rr]outer)\.use\(\s*(?:'([^']*)',\s*)?(\w*[Rr]outer)\s*\)/g)) {
    nestings.push({ parent: m[1], prefix: m[2] ?? '', child: m[3] });
  }
}
for (let pass = 0; pass < 8; pass++) {
  let changed = false;
  for (const { parent, prefix, child } of nestings) {
    const base = mountFor.get(parent);
    if (base === undefined || mountFor.has(child)) continue;
    if (prefix) console.log(`note: ${parent}.use('${prefix}', ${child}) — prefixed nesting, mount is ${base}${prefix}`);
    mountFor.set(child, `${base}${prefix}`);
    changed = true;
  }
  if (!changed) break;
}

const staticRoutes = new Set();
const unattributed = [];
for (const f of API_ALL) {
  let code;
  try { code = strip(read(f)); } catch { continue; }
  for (const m of code.matchAll(/\b(\w*[Rr]outer)\.(get|post|patch|put|delete)\(\s*'(\/[^']*)'/g)) {
    const mount = mountFor.get(m[1]);
    if (!mount) { unattributed.push(`${f}: ${m[1]}.${m[2]}('${m[3]}')`); continue; }
    staticRoutes.add(`${m[2].toUpperCase()} ${mount}${m[3] === '/' ? '' : m[3]}`);
  }
}

// ── 2 · what EXPRESS actually serves ────────────────────────────────────────
/**
 * The live `Router` objects, walked directly.
 *
 * The first version of this walked `app._router.stack` and recovered each mount path from the layer's regexp.
 * Express 5 builds those regexps differently (path-to-regexp v8), so it found **5 routes out of 202** and
 * cheerfully reported the other 197 as "not served" — a completeness check that was itself the least complete
 * thing in the repo. Reading `express/package.json` (5.2.1) is what settled it.
 *
 * Importing each mounted router and reading `router.stack[].route.path` needs no regexp archaeology: the paths
 * come from the objects the app dispatches on. The MOUNT prefixes still come from `app.use('/api/x', router)`
 * in source — they are literal strings, and the audit says so rather than implying otherwise.
 */
const routerExport = new Map();
for (const m of APP.matchAll(/import \{ (\w+) \} from '\.\/(api\/[^']+)\.js'/g)) {
  routerExport.set(m[1], `server/dist/${m[2]}.js`);
}

/**
 * Routes on a router, INCLUDING the sub-routers it mounts with a bare `use()`.
 *
 * `brainRouter` is an aggregate: `brainRouter.use(memoriesRouter)` and seven siblings, each mounted with no
 * prefix so their own paths are already complete (`/spaces/:spaceId/memories`). `syncRouter` and
 * `networksRouter` do the same. Reading only the top-level `.route` layers therefore saw 115 of 202 routes and
 * reported the other 87 as unserved — the first version of this audit did exactly that.
 *
 * A prefixed `use('/x', sub)` would need its mount recovered; none exists today, and if one is added the
 * `pathPrefix` guard below turns it into a loud failure rather than a silent undercount.
 */
function collect(router, mount, out) {
  for (const layer of router.stack ?? []) {
    if (layer.route) {
      const path = layer.route.path;
      if (typeof path !== 'string') continue;
      const full = `${mount}${path === '/' ? '' : path}`;
      for (const [method, on] of Object.entries(layer.route.methods ?? {})) {
        if (on && method !== '_all') out.add(`${method.toUpperCase()} ${full}`);
      }
      continue;
    }
    const sub = layer.handle;
    if (typeof sub === 'function' && Array.isArray(sub.stack)) {
      // `layer.path` is '/' for a bare use(); anything else means a prefix this walk would drop.
      const prefix = typeof layer.path === 'string' && layer.path !== '/' ? layer.path : '';
      if (prefix) {
        note(`a sub-router is mounted at '${prefix}' under ${mount} — this walk assumes bare use(); `
          + 'the count below is not trustworthy until it handles the prefix');
      }
      collect(sub, `${mount}${prefix}`, out);
    }
  }
}

let runtimeRoutes = new Set();
let runtimeOk = true;
for (const m of APP.matchAll(/app\.use\('(\/[^']*)',\s*(\w+)\)/g)) {
  const [, mount, ident] = m;
  const dist = routerExport.get(ident);
  if (!dist) continue;                       // not a router import (middleware, etc.)
  try {
    const mod = await import(`file://${join(ROOT, dist)}`);
    const router = mod[ident];
    if (!router?.stack) { note(`${ident} exported no router stack — ${mount} is UNVERIFIED`); runtimeOk = false; continue; }
    collect(router, mount, runtimeRoutes);
  } catch (err) {
    note(`importing ${dist} failed (${err.message}) — ${mount} is UNVERIFIED, which is a gap and not a pass`);
    runtimeOk = false;
  }
}

if (runtimeRoutes.size === 0) {
  note('no routes were enumerated at runtime — the comparison below would be vacuous');
  runtimeOk = false;
}

if (runtimeOk) {
  const onlyRuntime = [...runtimeRoutes].filter(r => !staticRoutes.has(r)).sort();
  const onlyStatic = [...staticRoutes].filter(r => !runtimeRoutes.has(r)).sort();
  if (onlyRuntime.length) note(`routes the router SERVES that the matrix misses (${onlyRuntime.length}):\n    ${onlyRuntime.join('\n    ')}`);
  if (onlyStatic.length) note(`routes the matrix claims that no router serves (${onlyStatic.length}):\n    ${onlyStatic.join('\n    ')}`);
  console.log(`routes — live routers ${runtimeRoutes.size}, static extraction ${staticRoutes.size}, `
    + `disagreement ${onlyRuntime.length + onlyStatic.length}`);
}

// ── 3 · tool completeness, from the registry ────────────────────────────────
const { ALL_TOOLS } = await import(`file://${join(ROOT, 'server/dist/mcp/tools/index.js')}`);
const matrixSrc = read('scripts/surface-matrix.mjs');
const mapped = new Set([...matrixSrc.matchAll(/\['[^']*', '([a-z_0-9]+)',/g)].map(m => m[1]));
const unmapped = ALL_TOOLS.map(t => t.name).filter(n => !mapped.has(n));
if (unmapped.length) note(`tools absent from the map: ${unmapped.join(', ')}`);
console.log(`tools — registry ${ALL_TOOLS.length}, mapped ${mapped.size}`);

// ── 4 · mapping soundness: do the two doors reach the same module? ──────────
const TOOL_FILES = execFileSync('git', ['ls-files', 'server/src/mcp/tools'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map(l => l.trim()).filter(l => l.endsWith('.ts'));
const API_FILES = execFileSync('git', ['ls-files', 'server/src/api'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map(l => l.trim()).filter(l => l.endsWith('.ts'));

/** Modules under brain/ files/ spaces/ that a source file imports. */
const DOMAIN_DIRS = 'brain|files|spaces|auth|sync|networks|config|metrics|quota';
/**
 * Static AND dynamic imports.
 *
 * `list_tokens` reaches its implementation with `await import('../../auth/tokens.js')` inside the handler, so a
 * `from '…'`-only regex reported it as sharing nothing with `GET /api/tokens` — which imports the same module
 * statically. One flagged pair, entirely the detector's fault.
 */
const domainImports = src => new Set(
  [...src.matchAll(new RegExp(`(?:from|import\\()\\s*'(?:\\.\\./)+(${DOMAIN_DIRS})/([\\w-]+)\\.js'`, 'g'))]
    .map(m => `${m[1]}/${m[2]}`));

const toolImports = new Map();
for (const f of TOOL_FILES) {
  const src = read(f);
  for (const m of src.matchAll(/^\s*name: '([a-z_0-9]+)',$/gm)) toolImports.set(m[1], domainImports(src));
}
const apiImports = new Map();
for (const f of API_FILES) apiImports.set(f, domainImports(read(f)));

/** Which api file registers a given route path? */
function apiFileFor(route) {
  const [, path] = route.split(' ');
  for (const { mount, file } of mounts) {
    if (!path.startsWith(mount)) continue;
    const sub = path.slice(mount.length) || '/';
    for (const f of filesFor(file)) {
      const code = strip(read(f));
      if (code.includes(`'${sub}'`)) return f;
    }
  }
  return null;
}

const pairs = [...matrixSrc.matchAll(/\['[^']*', '([a-z_0-9]+)', (?:'([A-Z]+ [^']+)'|null)/g)]
  .map(m => ({ tool: m[1], route: m[2] ?? null }));
const noShared = [];
for (const { tool, route } of pairs) {
  if (!route) continue;
  const f = apiFileFor(route);
  if (!f) { noShared.push(`${tool} -> ${route} (route file not found)`); continue; }
  const a = toolImports.get(tool) ?? new Set();
  const b = apiImports.get(f) ?? new Set();
  const shared = [...a].filter(x => b.has(x));
  if (shared.length === 0) noShared.push(`${tool} -> ${route} (no shared brain/files/spaces module)`);
}
if (noShared.length) {
  console.log(`\npairs with no shared implementation module (${noShared.length}) — each needs a human look, `
    + 'they are not necessarily wrong:');
  for (const n of noShared) console.log(`    ${n}`);
}

// ── verdict ─────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error(`\nAUDIT FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}
console.log('\nAUDIT PASSED — routes agree with Express, every tool is mapped.');
