/**
 * Every API path named in the docs exists in a router.
 *
 * Slice 3 of the pre-release documentation audit. A documented endpoint that does not exist is the
 * most expensive doc bug there is: someone writes an integration against it, gets a 404, and has
 * nothing to tell them the endpoint was never real.
 *
 * All 182 documented endpoints check out today, so this ships as a gate rather than a correction.
 *
 * ── Resolving the routes is the whole difficulty ────────────────────────────────────────────────
 *
 * A naive extractor proposed 89 findings out of 182 — roughly half the documented API — which is a
 * broken scanner, not a doc crisis. Five separate defects had to be fixed, each found by opening the
 * source rather than believing the output:
 *
 *   1. PATH-LESS composition. The whole sync API is built as `syncRouter.use(syncDocsRouter)`, with no
 *      path argument, so every `/api/sync/*` route was invisible.
 *   2. Routes declared straight on the app — `app.post('/api/admin/reload-config')` — rather than on a
 *      mounted router.
 *   3. Routers mounted at MORE THAN ONE path. `setupRouter` serves both `/api/setup` and `/setup`;
 *      keeping one prefix per router made every setup endpoint look missing.
 *   4. Concrete example values in the docs. `PATCH /api/spaces/research` is an example of
 *      `/api/spaces/:id`, not a different endpoint, so comparison has to be structural.
 *   5. Brace alternation shorthand: `/api/brain/spaces/:id/{memories,entities,edges,chrono}` documents
 *      four endpoints in one line.
 *
 * If this test ever fails, check it against that list before editing a doc — the most likely
 * explanation for a new failure is a routing pattern the extractor has not met yet.
 *
 * Run: node --test testing/standalone/route-path-docs-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules' && e !== 'dist') walk(p, out); }
    else out.push(p);
  }
  return out;
}

const VERBS = 'get|post|put|patch|delete';
const norm = (p) => p.replace(/:[A-Za-z0-9_]+/g, ':P').replace(/\{[^}]+\}/g, ':P').replace(/\/+$/, '');

function knownRoutes() {
  const files = walk(join(ROOT, 'server', 'src')).filter(f => f.endsWith('.ts'));
  const sources = new Map(files.map(f => [f, readFileSync(f, 'utf8')]));

  // (1) mount prefixes — a router may have several.
  const prefixes = new Map();
  const addPrefix = (v, p) => {
    if (!prefixes.has(v)) prefixes.set(v, new Set());
    prefixes.get(v).add(p);
  };
  for (const m of sources.get(join(ROOT, 'server', 'src', 'app.ts')).matchAll(
    /app\.use\(\s*'([^']+)'\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) addPrefix(m[2], m[1]);

  // (2) nested mounts, both prefixed and path-less, to a fixed point.
  for (let pass = 0; pass < 5; pass++) {
    for (const src of sources.values()) {
      for (const m of src.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\.use\(\s*'([^']+)'\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/g)) {
        for (const p of prefixes.get(m[1]) ?? []) addPrefix(m[3], p + m[2]);
      }
      for (const m of src.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\.use\(\s*([A-Za-z_][A-Za-z0-9_]*Router)\s*\)/g)) {
        for (const p of prefixes.get(m[1]) ?? []) addPrefix(m[2], p);
      }
    }
  }

  const routes = new Set();
  for (const src of sources.values()) {
    for (const m of src.matchAll(new RegExp(`([A-Za-z_][A-Za-z0-9_]*)\\.(${VERBS})\\(\\s*'([^']*)'`, 'g'))) {
      const [, v, method, path] = m;
      for (const prefix of prefixes.get(v) ?? []) {
        routes.add(`${method.toUpperCase()} ${norm((prefix + (path === '/' ? '' : path)) || '/')}`);
      }
    }
    // (3) app-level routes
    for (const m of src.matchAll(new RegExp(`\\bapp\\.(${VERBS})\\(\\s*'(/[^']*)'`, 'g'))) {
      routes.add(`${m[1].toUpperCase()} ${norm(m[2])}`);
    }
  }
  return routes;
}

/** Expand `{a,b,c}` alternation into one path each. */
function expand(path) {
  const m = path.match(/\{([^}]*,[^}]*)\}/);
  if (!m) return [path];
  return m[1].split(',').flatMap(opt => expand(path.replace(m[0], opt.trim())));
}

function documentedEndpoints() {
  const out = new Map();
  // Recursive: the integration guide is 17 files under `docs/integration-guide/` now, and a one-level
  // listing would have quietly stopped scanning almost every documented endpoint in the product.
  const mdFiles = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) mdFiles(full, out);
      else if (e.name.endsWith('.md')) out.push(full);
    }
    return out;
  };
  for (const full of mdFiles(join(ROOT, 'docs'))) {
    const f = full.split(/[\\/]docs[\\/]/)[1];
    const src = readFileSync(full, 'utf8');
    for (const m of src.matchAll(new RegExp(`\\b(GET|POST|PUT|PATCH|DELETE)\\s+(/api/[A-Za-z0-9_\\-/:{},.]*)`, 'g'))) {
      for (const path of expand(m[2])) {
        const key = `${m[1]} ${norm(path)}`;
        if (!out.has(key)) out.set(key, new Set());
        out.get(key).add(f);
      }
    }
  }
  return out;
}

/** Structural match: a route's :P matches any single documented segment. */
function matches(known, docKey) {
  if (known.has(docKey)) return true;
  const [dm, dp] = docKey.split(' ');
  const dSegs = dp.split('/');
  for (const k of known) {
    const [km, kp] = k.split(' ');
    if (km !== dm) continue;
    const kSegs = kp.split('/');
    if (kSegs.length === dSegs.length && kSegs.every((s, i) => s === ':P' || s === dSegs[i])) return true;
  }
  return false;
}

describe('documented API paths exist', () => {
  const known = knownRoutes();
  const documented = documentedEndpoints();

  it('resolves the routing table and the docs (the check itself works)', () => {
    // Without this, an extractor regression that finds nothing would make the assertion below pass by
    // examining nothing — the failure mode where a gate silently stops gating.
    assert.ok(known.size > 150, `expected to resolve the routing table, found ${known.size} routes`);
    assert.ok(documented.size > 100, `expected documented endpoints, found ${documented.size}`);
  });

  it('every documented endpoint resolves to a real route', () => {
    const missing = [...documented.entries()]
      .filter(([key]) => !matches(known, key))
      .map(([key, docs]) => `  ${key}  (in ${[...docs].join(', ')})`);

    assert.equal(missing.length, 0,
      `These endpoints are documented but no router declares them — an integration written against ` +
      `one would 404 with nothing to explain it:\n${missing.join('\n')}\n\n` +
      'Before editing a doc, check the header of this file: five separate extractor defects produced ' +
      'false findings here, and a new routing pattern is the likelier cause.');
  });
});
