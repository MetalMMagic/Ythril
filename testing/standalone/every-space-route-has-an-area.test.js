/**
 * Every space-scoped route is classified into an area, or the build fails.
 *
 * ## What this is for
 *
 * The per-space rights matrix only governs what it knows about. A route nobody assigned to an area is not
 * refused and does not warn — it keeps working at whatever access the old model gave it, while the UI shows
 * a grid implying otherwise. That is the failure this repo keeps meeting: a control that looks complete
 * because nothing contradicts it.
 *
 * So the inventory in `server/src/auth/space-rights.ts` is checked against the ROUTE SURFACE, discovered
 * here from source. A route that is neither classified nor explicitly exempt fails, and the message names
 * it. Adding a space-scoped route without deciding what it means becomes impossible rather than merely
 * discouraged.
 *
 * ## Why the surface is discovered rather than listed
 *
 * A hand-written list of routes is the same artefact as the inventory, so comparing them would prove
 * nothing — both would be edited in the same commit by the same person making the same assumption. The
 * surface is read out of the router files instead.
 *
 * Run: node --test testing/standalone/every-space-route-has-an-area.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const withoutComments = (text) =>
  text.replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '');

const INVENTORY = 'server/src/auth/space-rights.ts';

/**
 * Routers whose every route is space-scoped, and the prefix each is mounted at.
 *
 * Discovered files, fixed mounts: the mount lives in `app.ts` and is the one thing a router file cannot
 * tell us. The `duplicates`/`contradictions`/`conflicts` trio is here because those routes scope by
 * ITERATING the token's spaces rather than by taking one in the path — the reason `scope` exists on a
 * `RouteRight` at all.
 */
const SPACE_ROUTERS = [
  { glob: 'server/src/api/brain', mount: '/api/brain' },
  { glob: 'server/src/api/files.ts', mount: '/api/files' },
  { glob: 'server/src/api/duplicates.ts', mount: '/api/duplicates' },
  { glob: 'server/src/api/contradictions.ts', mount: '/api/contradictions' },
  { glob: 'server/src/api/conflicts.ts', mount: '/api/conflicts' },
  /*
   * THE SPACES ROUTER, added 2026-08-29 after it was found ungoverned in production logs.
   *
   * It was left out because it is "not wholly space-scoped" — some of its routes address the COLLECTION
   * (`GET /api/spaces`, `POST /api/spaces`, `POST /api/spaces/reorder`) rather than one space. That reason was
   * true and the conclusion did not follow: a router with a few collection routes needs those three EXEMPTED,
   * not the other eleven left unasked. Excluding the file meant the completeness question was never put to it,
   * and nine space-scoped routes sat unclassified — `DELETE /api/spaces/:id` among them, warning on every call
   * that its area was unenforced while this gate reported the surface clean.
   *
   * The glob is a pattern rather than the one filename because `spaces-activity.ts` and `spaces-reembed.ts`
   * register routes onto the SAME router from other files. Two of the nine were theirs, and a sweep of
   * `spaces.ts` alone cannot see them — which is the same blind spot one level down.
   */
  { glob: 'server/src/api/spaces*.ts', mount: '/api/spaces' },
];

function filesUnder(p) {
  return execFileSync('git', ['ls-files', p], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(l => l.trim()).filter(l => l.endsWith('.ts') && !l.endsWith('_shared.ts'));
}

/** Every `router.VERB('path')` in the given routers, as `METHOD mount+path`. */
function discoveredRoutes() {
  const out = new Set();
  for (const { glob, mount } of SPACE_ROUTERS) {
    for (const f of filesUnder(glob)) {
      const code = withoutComments(read(f));
      // The path must START with '/'. Without that, `res.set('If-Match', …)` and any other
      // `.get('Header-Name')` read as a route and the gate demands they be classified.
      for (const m of code.matchAll(/\.(get|post|patch|put|delete)\(\s*'(\/[^']*)'/g)) {
        const path = m[2] === '/' ? '' : m[2];
        out.add(`${m[1].toUpperCase()} ${mount}${path}`);
      }
    }
  }
  return out;
}

/** Everything the inventory claims, as the same `METHOD route` key. */
function classifiedRoutes() {
  const code = read(INVENTORY);
  const out = new Set();
  for (const m of code.matchAll(/route:\s*'([^']+)',\s*method:\s*'([A-Z]+)'/g)) {
    out.add(`${m[2]} ${m[1]}`);
  }
  return out;
}

function exemptRoutes() {
  const code = read(INVENTORY);
  const block = code.slice(code.indexOf('NOT_AREA_SCOPED'));
  return new Set([...block.matchAll(/route:\s*'([^']+)'/g)].map(m => m[1]));
}

/**
 * Does this route exist on the real surface? Takes `METHOD path` or a bare path.
 *
 * Extracted because the two staleness checks below need the identical question, and this repo's most-produced
 * defect is one rule with two implementations where the weaker one wins.
 *
 * It used to have a second implementation anyway. Routes under `/api/spaces/` took a branch that concatenated
 * three source files and asked `code.includes("'/:id'")` — **a substring search that discarded the METHOD**. So
 * `GET /api/spaces/:id` was reported to exist because some other verb was registered on that path, and the
 * inventory carried a row for a route that has never existed. The branch was written to compensate for the
 * spaces router being absent from `SPACE_ROUTERS`; now that it is present, one implementation answers for
 * every router and the weaker copy is gone.
 */
function routeExists(methodAndPath) {
  const space = methodAndPath.indexOf(' ');
  const bare = space === -1 ? methodAndPath : methodAndPath.slice(space + 1);
  const found = discoveredRoutes();
  // A bare path matches any verb registered on it, which is what a method-less exemption means.
  return space === -1
    ? [...found].some(r => r.slice(r.indexOf(' ') + 1) === bare)
    : found.has(methodAndPath);
}

describe('every space-scoped route is classified', () => {
  it('discovers a real route surface', () => {
    // A gate that enumerates nothing passes vacuously, and would keep passing if a router moved.
    const found = discoveredRoutes();
    assert.ok(found.size >= 30, `expected the space routers to yield many routes, found ${found.size}`);
    assert.ok([...found].some(r => r.includes(':spaceId')), 'no :spaceId route found — re-point SPACE_ROUTERS');
  });

  it('the inventory is not empty and names all four areas', () => {
    const code = read(INVENTORY);
    for (const area of ['knowledge', 'files', 'schema', 'dataQuality']) {
      assert.match(code, new RegExp(`area:\\s*'${area}'`), `no route is classified as ${area}`);
    }
  });

  it('no discovered route is unclassified', () => {
    const classified = classifiedRoutes();
    const exempt = exemptRoutes();
    const missing = [...discoveredRoutes()].filter(r => {
      if (classified.has(r)) return false;
      const path = r.slice(r.indexOf(' ') + 1);
      return !exempt.has(path);
    }).sort();
    assert.deepEqual(
      missing,
      [],
      `these space-scoped routes belong to no area and are not exempt, so the rights matrix does not govern `
      + `them:\n  ${missing.join('\n  ')}\nAdd each to ROUTE_RIGHTS with its area, the lowest rung that may `
      + `call it, and whether it scopes by 'path' or 'iterates' — or to NOT_AREA_SCOPED with a reason.`,
    );
  });

  it('the inventory claims no route that does not exist', () => {
    // The other direction, and the one that rots quietly: a classified route that was deleted or renamed
    // leaves a rule guarding nothing, and the count still looks healthy.
    const stale = [...classifiedRoutes()].filter(r => !routeExists(r)).sort();
    assert.deepEqual(stale, [], `the inventory classifies routes that no longer exist:\n  ${stale.join('\n  ')}`);
  });

  it('and the EXEMPTION list claims none either', () => {
    /*
     * The same rot, on the list nobody was checking. `/api/spaces/:id/token-access` sat in NOT_AREA_SCOPED
     * with a two-line reason for a route that does not exist anywhere in the server — the only token-access
     * route is the brain one, which has its own entry. Found by reading the list while fixing the runtime,
     * not by any gate: the staleness check above iterated `classifiedRoutes()` alone, so an exemption could
     * name anything at all.
     *
     * Worth its own test rather than a wider one, because a stale exemption is the more dangerous of the two.
     * A stale CLASSIFICATION guards nothing and enforces nothing. A stale EXEMPTION is a standing licence:
     * the day a route with that path is added, it arrives pre-excused from the rights matrix and no gate
     * objects, because the excuse was written before the route existed.
     *
     * Exemptions carry no method, so existence is checked path-only — `routeExists` takes either shape.
     */
    const stale = [...exemptRoutes()].filter(r => !routeExists(r)).sort();
    assert.deepEqual(stale, [], 'NOT_AREA_SCOPED exempts routes that do not exist. Delete the entry — an '
      + 'exemption for a path nothing serves is a standing licence for whatever is added there next:\n  '
      + stale.join('\n  '));
  });

  it('every data-quality route scopes by iterating, not by path', () => {
    // The finding this whole file exists to protect. Those routes take no space and walk the token's
    // accessible ones, so their enforcement point is the ITERATION SET. Classifying one as 'path' would
    // produce a guard that reads correctly and never fires.
    const code = read(INVENTORY);
    for (const m of code.matchAll(/area:\s*'dataQuality',\s*needs:\s*'\w+',\s*scope:\s*'(\w+)'/g)) {
      assert.equal(m[1], 'iterates',
        'a data-quality route is classified as path-scoped; those routes take no space in the URL');
    }
  });
});
