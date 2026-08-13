/**
 * The capability × surface matrix.
 *
 * Rows are CAPABILITIES — one MCP tool and the REST route that does the same thing — because that is the pair
 * the owner's parity rule is about. Every mapped route is verified to EXIST in the extracted route set, and
 * every tool is verified to exist in `ALL_TOOLS`: an unresolvable row throws rather than being published,
 * because a reference nobody can trust is worse than no reference.
 *
 * A second table lists the REST routes no tool covers, so the REST-only surface is visible rather than implied.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = p => readFileSync(join(ROOT, p), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*/gm, '$1');

// ── routes, as before ───────────────────────────────────────────────────────
const APP = strip(read('server/src/app.ts'));
const routerFile = new Map();
for (const m of APP.matchAll(/import \{ (\w+) \} from '\.\/(api\/[^']+)\.js'/g)) routerFile.set(m[1], `server/src/${m[2]}.ts`);
const mounts = [];
for (const m of APP.matchAll(/app\.use\('(\/api\/[^']*)',\s*(\w+)\)/g)) {
  const file = routerFile.get(m[2]);
  if (file) mounts.push({ mount: m[1], file });
}
const filesFor = file => {
  if (!file.endsWith('/index.ts')) return [file];
  const dir = file.slice(0, -'/index.ts'.length);
  return execFileSync('git', ['ls-files', dir], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').map(l => l.trim()).filter(l => l.endsWith('.ts'));
};
const routes = new Set();
const routeArea = new Map();
for (const { mount, file } of mounts) {
  for (const f of filesFor(file)) {
    let code;
    try { code = strip(read(f)); } catch { continue; }
    for (const m of code.matchAll(/\b\w*[Rr]outer\.(get|post|patch|put|delete)\(\s*'(\/[^']*)'/g)) {
      const key = `${m[1].toUpperCase()} ${mount}${m[2] === '/' ? '' : m[2]}`;
      routes.add(key);
      routeArea.set(key, mount);
    }
  }
}

const { ALL_TOOLS } = await import(`file://${join(ROOT, 'server/dist/mcp/tools/index.js')}`);
const tools = new Set(ALL_TOOLS.map(t => t.name));

// ── the mapping, by hand and verified ───────────────────────────────────────
// `null` REST means the capability exists on MCP only; a note says why.
const MAP = [
  ['Brain — memories', 'remember', 'POST /api/brain/spaces/:spaceId/memories'],
  ['Brain — memories', 'update_memory', 'PATCH /api/brain/spaces/:spaceId/memories/:id'],
  ['Brain — memories', 'delete_memory', 'DELETE /api/brain/spaces/:spaceId/memories/:id'],
  ['Brain — entities', 'upsert_entity', 'POST /api/brain/spaces/:spaceId/entities'],
  ['Brain — entities', 'update_entity', 'PATCH /api/brain/spaces/:spaceId/entities/:id'],
  ['Brain — entities', 'delete_entity', 'DELETE /api/brain/spaces/:spaceId/entities/:id'],
  ['Brain — entities', 'merge_entities', 'POST /api/brain/spaces/:spaceId/entities/:survivorId/merge/:absorbedId'],
  ['Brain — entities', 'find_entities_by_name', 'GET /api/brain/spaces/:spaceId/entities/by-name'],
  ['Brain — edges', 'upsert_edge', 'POST /api/brain/spaces/:spaceId/edges'],
  ['Brain — edges', 'update_edge', 'PATCH /api/brain/spaces/:spaceId/edges/:id'],
  ['Brain — edges', 'delete_edge', 'DELETE /api/brain/spaces/:spaceId/edges/:id'],
  ['Brain — chrono', 'create_chrono', 'POST /api/brain/spaces/:spaceId/chrono'],
  ['Brain — chrono', 'update_chrono', 'PATCH /api/brain/spaces/:spaceId/chrono/:id'],
  ['Brain — chrono', 'delete_chrono', 'DELETE /api/brain/spaces/:spaceId/chrono/:id'],
  ['Brain — chrono', 'list_chrono', 'GET /api/brain/spaces/:spaceId/chrono'],
  ['Brain — search', 'recall', 'POST /api/brain/spaces/:spaceId/recall'],
  ['Brain — search', 'query', 'POST /api/brain/spaces/:spaceId/query'],
  ['Brain — search', 'find_similar', 'POST /api/brain/spaces/:spaceId/find-similar'],
  ['Brain — search', 'traverse', 'POST /api/brain/spaces/:spaceId/traverse'],
  ['Brain — bulk', 'bulk_write', 'POST /api/brain/spaces/:spaceId/bulk'],
  ['Brain — ops', 'get_stats', 'GET /api/brain/spaces/:spaceId/stats'],
  ['Brain — ops', 'reindex', 'POST /api/brain/spaces/:spaceId/reindex'],
  ['Brain — ops', 'list_embed_jobs', 'GET /api/brain/spaces/:spaceId/embedding-queue/records'],
  ['Brain — ops', 'retry_record_embedding', 'POST /api/brain/spaces/:spaceId/embedding-queue/records/retry'],
  ['Files', 'read_file', 'GET /api/files/:spaceId'],
  ['Files', 'write_file', 'POST /api/files/:spaceId'],
  ['Files', 'delete_file', 'DELETE /api/files/:spaceId'],
  ['Files', 'move_file', 'PATCH /api/files/:spaceId'],
  ['Files', 'list_dir', 'GET /api/files/:spaceId'],
  ['Files', 'create_dir', 'POST /api/files/:spaceId/mkdir'],
  ['Files', 'retry_embedding', 'POST /api/files/:spaceId/retry_embedding'],
  ['Spaces', 'list_spaces', 'GET /api/spaces'],
  ['Spaces', 'create_space', 'POST /api/spaces'],
  ['Spaces', 'update_space', 'PATCH /api/spaces/:id'],
  ['Spaces', 'get_space_meta', 'GET /api/spaces/:id/meta'],
  ['Spaces', 'update_space_schema', 'PUT /api/spaces/:id/schema'],
  ['Spaces', 'wipe_space', null, 'MCP wipes every collection in one call; REST has one DELETE per collection '
    + '(`/memories`, `/entities`, `/edges`, `/chrono`), so the composite is MCP-only.'],
  ['Tokens', 'list_tokens', 'GET /api/tokens'],
  ['Networks / sync', 'list_peers', 'GET /api/networks'],
  ['Networks / sync', 'sync_now', 'POST /api/networks/:id/sync'],
  ['Meta', 'help', null, 'Self-documenting guide for tool callers. Its REST counterpart is the integration '
    + 'guide itself, which is why there is no route.'],
];

const missingTools = MAP.map(r => r[1]).filter(t => !tools.has(t));
if (missingTools.length) throw new Error(`mapped tools that do not exist: ${missingTools.join(', ')}`);
const missingRoutes = MAP.map(r => r[2]).filter(r => r && !routes.has(r));
if (missingRoutes.length) throw new Error(`mapped routes that do not exist: ${missingRoutes.join(' | ')}`);
const unmapped = [...tools].filter(t => !MAP.some(r => r[1] === t)).sort();
if (unmapped.length) throw new Error(`tools missing from the map: ${unmapped.join(', ')}`);

// ── doc corpora ─────────────────────────────────────────────────────────────
const corpus = dir => execFileSync('git', ['ls-files', dir], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').map(l => l.trim()).filter(l => l.endsWith('.md')).map(f => ({ f, text: read(f) }));
const GUIDE = corpus('docs/integration-guide');
const USER = corpus('docs/userguide');
const CHANGELOG = [{ f: 'CHANGELOG.md', text: read('CHANGELOG.md') }];
const ARCHIVE = corpus('changelog');

const short = f => f.split('/').pop().replace(/\.md$/, '');
/** Files in `list` naming either the tool or the route tail. */
function hits(list, tool, route) {
  const tail = route ? route.split(' ')[1].replace(/^\/api\//, '') : null;
  const loose = tail ? new RegExp(tail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:\\?\w+/g, '[^/\\s)`"\']+')) : null;
  const byName = new RegExp(`\\b${tool}\\b`);
  const out = [];
  for (const { f, text } of list) if (byName.test(text) || (loose && loose.test(text))) out.push(short(f));
  return out;
}

const rows = MAP.map(([area, tool, route, note]) => ({
  area, tool, route, note,
  guide: hits(GUIDE, tool, route),
  user: hits(USER, tool, route),
  changelog: hits(CHANGELOG, tool, route).length > 0 || hits(ARCHIVE, tool, route).length > 0,
}));

const cell = a => (a.length ? a.join(', ') : '**—**');
const out = [];
out.push('| capability | MCP tool | REST route | integration guide | userguide | CHANGELOG |');
out.push('|---|---|---|---|---|---|');
let area = null;
for (const r of rows) {
  if (r.area !== area) { area = r.area; out.push(`| **${area}** | | | | | |`); }
  out.push(`| | \`${r.tool}\` | ${r.route ? `\`${r.route}\`` : '**MCP only**'} | ${cell(r.guide)} | ${cell(r.user)} | ${r.changelog ? 'y' : '**—**'} |`);
}

// ── REST routes no tool covers ──────────────────────────────────────────────
const mappedRoutes = new Set(MAP.map(r => r[2]).filter(Boolean));
const restOnly = [...routes].filter(r => !mappedRoutes.has(r)).sort();
const byArea = new Map();
for (const r of restOnly) {
  const a = routeArea.get(r) ?? '?';
  byArea.set(a, [...(byArea.get(a) ?? []), r]);
}
const rest = [];
rest.push('| mount | routes with no MCP tool | count |');
rest.push('|---|---|---|');
for (const [a, list] of [...byArea].sort((x, y) => y[1].length - x[1].length)) {
  rest.push(`| \`${a}\` | ${list.map(r => `\`${r.split(' ')[0]} ${r.split(' ')[1].slice(a.length) || '/'}\``).join(' ')} | ${list.length} |`);
}

writeFileSync(join(ROOT, 'todo/_matrix-capabilities.md'), out.join('\n'), 'utf8');
writeFileSync(join(ROOT, 'todo/_matrix-rest-only.md'), rest.join('\n'), 'utf8');
console.log(JSON.stringify({
  capabilities: rows.length, routes: routes.size, restOnly: restOnly.length,
  noGuide: rows.filter(r => !r.guide.length).length,
  noUser: rows.filter(r => !r.user.length).length,
  noChangelog: rows.filter(r => !r.changelog).length,
}));
