/**
 * Every environment variable the code reads is documented, and every one the docs name exists.
 *
 * Written during the pre-release doc audit, and kept as a gate rather than thrown away: the audit
 * found seven user-facing local-connector settings (token, port, tunnel name, cloudflared path…) that
 * existed only in the source. An undocumented setting is not a missing feature — it is a feature
 * nobody can find, and nothing anywhere reports it.
 *
 * The reverse direction matters as much. A variable named in the docs but absent from the code is
 * worse than an omission: a reader copies it into their compose file or `.env`, it does nothing, and
 * there is no error to explain why. Renames are the usual cause.
 *
 * ── Two false-positive classes this scanner had to learn ────────────────────────────────────────
 *
 * The first version reported three variables as absent from the code that are read on every request,
 * because it only matched `process.env[...]` and missed reads routed through an `envTrue(...)` helper.
 * The second reported `YTHRIL_PORT` as absent because it only looked at `server/src` — that one is a
 * docker-compose variable (`"${YTHRIL_PORT:-3200}:3200"`), never read by the server at all.
 *
 * Both are why compose files count as "code" here and why helper calls are matched. A scanner that
 * under-detects usage manufactures findings, and findings that turn out to be noise are how a check
 * like this gets ignored and then deleted.
 *
 * Run: node --test testing/standalone/env-var-docs-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist') walk(p, out);
    } else out.push(p);
  }
  return out;
}

/** Only this project's own namespaces — NODE_ENV, PATH and friends are not ours to document. */
const OURS = /^(YTHRIL_|MONGO_|MCP_|OIDC_)/;

const NAME = '([A-Z][A-Z0-9_]{2,})';
const READ_PATTERNS = [
  new RegExp(`process\\.env\\[['"]${NAME}['"]\\]`, 'g'),
  new RegExp(`process\\.env\\.${NAME}`, 'g'),
  new RegExp(`os\\.environ\\.get\\(\\s*['"]${NAME}['"]`, 'g'),
  new RegExp(`os\\.getenv\\(\\s*['"]${NAME}['"]`, 'g'),
  // Reads via helpers. Omitting these made the first run of this scan produce three false findings.
  new RegExp(`\\b(?:envTrue|envFalse|envInt|envNum|envStr|envList|readEnv|getEnv)\\(\\s*['"]${NAME}['"]`, 'g'),
];

/** Where a variable can legitimately be "used": source, plus compose/Dockerfile interpolation. */
function collectUsage() {
  const files = [
    ...walk(join(ROOT, 'server', 'src')).filter(f => f.endsWith('.ts')),
    ...walk(join(ROOT, 'sidecars')).filter(f => f.endsWith('.py')),
    ...['docker-compose.yml', 'Dockerfile'].map(f => join(ROOT, f)).filter(existsSync),
  ];

  const used = new Map();
  const add = (name, file) => {
    if (!used.has(name)) used.set(name, new Set());
    used.get(name).add(file.replace(ROOT, '').replace(/\\/g, '/').replace(/^[/\\]/, ''));
  };

  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const re of READ_PATTERNS) for (const m of src.matchAll(re)) add(m[1], f);

    // Env names held in a lookup table and read as `process.env[TABLE[key]]`.
    //
    // Same class of miss as the helper calls above, and added for the same reason. The per-slot egress
    // permissions are ten variables whose names live in one `Record<Slot, string>`; every one is really
    // read, just not at a `process.env['LITERAL']` site. Without this the scan would call all ten
    // phantoms and the honest fix — writing the names out so an operator can grep them — would be what
    // triggered the failure.
    //
    // Gated on the file actually indexing `process.env` with a non-literal, so a module that merely
    // MENTIONS a variable name in prose or an error message does not get credit for reading it.
    if (/process\.env\[\s*[A-Za-z_$]/.test(src)) {
      for (const m of src.matchAll(/['"]((?:YTHRIL_|MONGO_|MCP_|OIDC_)[A-Z0-9_]{2,})['"]/g)) add(m[1], f);
    }

    // Compose / Dockerfile interpolation: ${VAR} and ${VAR:-default}.
    //
    // ONLY for those files. Applying it to TypeScript matches ordinary template-literal
    // interpolation of SCREAMING_CASE constants — it reported `OIDC_HTTP_TIMEOUT_MS` and
    // `OIDC_PRIVATE_ISSUER_HINT` as undocumented settings when both are `export const` values that
    // happen to be interpolated into an error message.
    if (/(docker-compose\.ya?ml|Dockerfile)$/i.test(f)) {
      for (const m of src.matchAll(/\$\{([A-Z][A-Z0-9_]{2,})(?::-[^}]*)?\}/g)) add(m[1], f);
    }
  }
  return used;
}

function collectDocumented() {
  const docs = new Map();
  for (const f of readdirSync(join(ROOT, 'docs')).filter(n => n.endsWith('.md'))) {
    const src = readFileSync(join(ROOT, 'docs', f), 'utf8');
    for (const m of src.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
      if (!OURS.test(m[1])) continue;
      // A trailing underscore is never a real variable — it is the stub left behind when prose names a
      // FAMILY of them, `YTHRIL_ALLOW_PRIVATE_<SLOT>` or `YTHRIL_ALLOW_PRIVATE_*`, and the word-boundary
      // match keeps only the prefix. Counting those as documented settings makes the reverse check report
      // a phantom for every family the docs describe, which is a finding about the scanner, not the docs.
      if (m[1].endsWith('_')) continue;
      if (!docs.has(m[1])) docs.set(m[1], new Set());
      docs.get(m[1]).add(f);
    }
  }
  return docs;
}

describe('env vars — docs and code agree', () => {
  const used = collectUsage();
  const documented = collectDocumented();

  it('finds a meaningful number of variables (the scan itself still works)', () => {
    // Guards against a refactor silently breaking the patterns and turning both checks green by
    // finding nothing — the failure mode where a gate quietly stops gating.
    const ours = [...used.keys()].filter(n => OURS.test(n));
    assert.ok(ours.length >= 25, `expected the scan to find our env vars, found ${ours.length}`);
    assert.ok(documented.size >= 15, `expected docs to name our env vars, found ${documented.size}`);
  });

  it('every variable the code reads is documented', () => {
    const missing = [...used.entries()]
      .filter(([name]) => OURS.test(name) && !documented.has(name))
      .map(([name, files]) => `  ${name}  (read in ${[...files].slice(0, 2).join(', ')})`);

    assert.equal(missing.length, 0,
      `These settings exist but no doc mentions them, so nobody can find them:\n${missing.join('\n')}\n` +
      'Document them (docs/workstation-mode-guide.md or integration-guide.md), or rename them out of ' +
      'our namespaces if they are genuinely internal.');
  });

  it('every variable the docs name actually exists', () => {
    // The nastier direction: a reader copies it into .env, it does nothing, and nothing explains why.
    const phantom = [...documented.entries()]
      .filter(([name]) => !used.has(name))
      .map(([name, docs]) => `  ${name}  (documented in ${[...docs].join(', ')})`);

    assert.equal(phantom.length, 0,
      `These are documented but read nowhere — a reader would set them and see no effect:\n${phantom.join('\n')}\n` +
      'Fix the doc, or restore the variable if it was renamed.');
  });
});
