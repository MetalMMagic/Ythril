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

/**
 * Which variables are ours to document: everything the scan finds, minus an explicit ambient list.
 *
 * It used to be an allowlist of four namespaces — `YTHRIL_`/`MONGO_`/`MCP_`/`OIDC_` — which is the wrong
 * polarity for a completeness gate. **No model-endpoint variable was ever in scope**: not `EMBEDDING_URL`,
 * not `DOC_VLM_URL`, not one of the ten slots. That blind spot let three names that do not exist
 * (`EMBEDDING_BASE_URL`, `RERANK_BASE_URL`, `NLI_BASE_URL` — the real ones drop the `BASE_`) ship in the
 * integration guide's egress matrix, where a reader would set them and watch nothing happen.
 *
 * A denylist fails the right way round. A new variable in a namespace nobody anticipated is now *in* scope
 * and has to be documented or explicitly excused; under the allowlist it was silently exempt. Widening it
 * brought 40 more variables into scope and cost 9 doc entries, which is the ratio that makes a gate worth
 * having rather than worth suppressing.
 */
const AMBIENT = new Set([
  // The runtime's and the shell's, not ours.
  'NODE_ENV', 'NODE_OPTIONS', 'PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'HOSTNAME', 'TZ', 'LANG', 'SHELL',
  'PWD', 'COMSPEC', 'SYSTEMROOT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
  // CI-provided.
  'CI', 'GITHUB_TOKEN', 'GITHUB_ACTIONS', 'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24',
]);

/**
 * `SCREAMING_CASE` in the docs that is deliberately **not** a setting of ours.
 *
 * Each is listed with why, because an unexplained exemption is how a real finding gets waved through
 * later by someone extending the list. Nothing here may be a variable this codebase reads — the check
 * below asserts exactly that, so an entry added to silence a genuine finding fails.
 */
const NOT_A_SETTING = new Map([
  // API error codes, documented so a client can branch on them.
  ['INFRA_MANAGED', 'API error code'],
  ['FEATURE_DISABLED', 'API error code'],
  ['MFA_REQUIRED', 'API error code'],
  ['MERKLE_DIVERGENCE', 'sync conflict code'],
  ['REPARENT_REVERT_AVAILABLE', 'network notification code'],
  ['ERR_ERL_UNEXPECTED_X_FORWARDED_FOR', 'an express-rate-limit error code, quoted in a troubleshooting note'],
  // Source identifiers named in prose.
  ['EGRESS_SLOTS', 'a TypeScript constant the egress matrix is checked against'],
  ['FETCH_TIMEOUT_MS', 'a sync-engine constant, not settable'],
  ['BATCH_FETCH_TIMEOUT_MS', 'a sync-engine constant, not settable'],
  // Placeholders in copy-paste examples.
  ['YOUR_TENANT_ID', 'placeholder in an OIDC example'],
  ['YOUR_CLIENT_ID', 'placeholder in an OIDC example'],
  ['YOUR_API_IDENTIFIER', 'placeholder in an OIDC example'],
  ['YOUR_PASSWORD', 'placeholder in a login example'],
  ['YOUR_TOKEN', 'placeholder in a curl example'],
  // Other processes' environment, documented because an operator has to set them somewhere else.
  ['DOCKERHUB_USERNAME', 'a GitHub Actions secret, not read by the app'],
  ['DOCKERHUB_TOKEN', 'a GitHub Actions secret, not read by the app'],
  ['NUMBA_CACHE_DIR', "a third-party library's env, set in a sidecar image"],
  // `HF_HUB_OFFLINE` used to sit here, exempted as "a third-party library's env, set in a sidecar image".
  // That was true and became false: the Node process reads it now, because transformers.js does NOT (it is
  // Python's variable) and an operator who sets it stack-wide has every right to expect the embedding model
  // to obey. This gate is what noticed — the exemption's stated reason stopped matching the code, and the
  // fix is a documented setting rather than a wider allowlist.
  ['XDG_CACHE_HOME', "a third-party library's env, set in a sidecar image"],
  // Removed settings the docs still name so an upgrader can find out they are gone.
  ['MEDIA_EMBEDDING_ENABLED', 'removed in 2.0.0; documented as a breaking change'],
]);

const OURS = (name) => !AMBIENT.has(name);

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
      for (const m of src.matchAll(/['"]([A-Z][A-Z0-9_]{2,})['"]/g)) add(m[1], f);
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

/**
 * What the docs *name as a setting*, as opposed to what they merely capitalise.
 *
 * `SCREAMING_CASE` in prose is not only env vars — the guides are full of `HTTP`, `JSON`, `OCR`, `VLM`,
 * `TOTP`, `SSRF`. While the scope was four namespaces the prefix filtered those out for free; a denylist
 * does not, so the shape of the token has to.
 *
 * The rule: an underscore, **or** a name the code actually reads. An env var in this project either
 * carries an underscore (`EMBEDDING_URL`, `RENDER_MAX_BYTES`) or is a single well-known word the code
 * demonstrably reads (`PORT`, `DEBUG`). An acronym has neither. That keeps the phantom check pointed at
 * the class of mistake it exists for — `EMBEDDING_BASE_URL` for `EMBEDDING_URL`, a name shaped exactly
 * like a setting and belonging to nothing.
 */
function collectDocumented(used) {
  const docs = new Map();
  // Recursive. The integration guide is 17 files in a subdirectory now, and it documents most of the
  // env vars — a one-level listing would report almost all of them as undocumented.
  const mdUnder = (dir, prefix = '', out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) mdUnder(join(dir, e.name), `${prefix}${e.name}/`, out);
      else if (e.name.endsWith('.md')) out.push(`${prefix}${e.name}`);
    }
    return out;
  };
  for (const f of mdUnder(join(ROOT, 'docs'))) {
    const src = readFileSync(join(ROOT, 'docs', f), 'utf8');
    for (const m of src.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
      if (!OURS(m[1])) continue;
      if (!m[1].includes('_') && !used.has(m[1])) continue;
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
  const documented = collectDocumented(used);

  it('finds a meaningful number of variables (the scan itself still works)', () => {
    // Guards against a refactor silently breaking the patterns and turning both checks green by
    // finding nothing — the failure mode where a gate quietly stops gating.
    const ours = [...used.keys()].filter(n => OURS(n));
    assert.ok(ours.length >= 25, `expected the scan to find our env vars, found ${ours.length}`);
    assert.ok(documented.size >= 15, `expected docs to name our env vars, found ${documented.size}`);
  });

  it('every variable the code reads is documented', () => {
    const missing = [...used.entries()]
      .filter(([name]) => OURS(name) && !documented.has(name))
      .map(([name, files]) => `  ${name}  (read in ${[...files].slice(0, 2).join(', ')})`);

    assert.equal(missing.length, 0,
      `These settings exist but no doc mentions them, so nobody can find them:\n${missing.join('\n')}\n` +
      'Document them (docs/workstation-mode-guide.md or integration-guide.md), or rename them out of ' +
      'our namespaces if they are genuinely internal.');
  });

  it('the not-a-setting list never hides a real setting', () => {
    // The failure this forecloses: a genuine undocumented variable gets silenced by adding it to the
    // exemption list rather than documenting it. If the code reads a name on that list, the list is
    // wrong, not the finding.
    const wrong = [...NOT_A_SETTING.keys()].filter(n => used.has(n));
    assert.deepEqual(wrong, [],
      'these are exempted as "not a setting" but the code reads them — document them instead');
  });

  it('every variable the docs name actually exists', () => {
    // The nastier direction: a reader copies it into .env, it does nothing, and nothing explains why.
    const phantom = [...documented.entries()]
      .filter(([name]) => !used.has(name) && !NOT_A_SETTING.has(name))
      .map(([name, docs]) => `  ${name}  (documented in ${[...docs].join(', ')})`);

    assert.equal(phantom.length, 0,
      `These are documented but read nowhere — a reader would set them and see no effect:\n${phantom.join('\n')}\n` +
      'Fix the doc, or restore the variable if it was renamed.');
  });
});
