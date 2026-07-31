/**
 * Every key in a documented `config.json` example is a real config field.
 *
 * Slice 2 of the pre-release documentation audit, kept as a gate. Config examples are the single most
 * copy-pasted thing in the docs, and a wrong key there fails in the worst possible way: unknown keys
 * are ignored, so an operator edits config.json, restarts, and the setting simply does nothing. No
 * error, no warning, nothing to search for.
 *
 * ── Identifying a config example precisely ──────────────────────────────────────────────────────
 *
 * This check is only worth having if its findings are trustworthy, and getting there took three
 * attempts:
 *
 *   1. Scanning every dotted `a.b` in backticks produced 69 proposals, overwhelmingly audit OPERATION
 *      names (`space.update`, `webhook.delete`) and hostnames.
 *   2. Parsing json blocks that contained any config-ish marker produced 36, mostly API RESPONSE
 *      fields — a response listing `spaces` looked like a config example.
 *   3. The rule that works: a block is a config example only when EVERY top-level key is a declared
 *      field of the `Config` interface. A response body fails that on its first key.
 *
 * Free-form maps (`typeSchemas`, `properties`, `spaceMap`, …) have user-chosen keys and are skipped
 * below that point — otherwise every example type name would read as an unknown field.
 *
 * A fourth correction was needed on the other side: field names must be matched anywhere, not only at
 * line start, because inline literals like `total?: { softLimitGiB: number; hardLimitGiB: number }`
 * declare fields on one line. A line-anchored pattern reported both as undeclared when both are used
 * throughout `files.ts`.
 *
 * ── The direction this was missing ──────────────────────────────────────────────────────────────
 *
 * Everything above checks **doc → code**: a documented key must be real. It said nothing about
 * **code → doc**, so a config field could be added and never documented, and nothing reported it. That
 * is the asymmetry `env-var-docs-coverage` grew a second check to close, and the same shape as four
 * scope-too-narrow defects found in one week.
 *
 * Adding it found `allowInsecurePlaintext` — undocumented, and on inspection **read by no code path at
 * all** while the security posture told the operator it disabled a guard. The gate's value is not the
 * doc entry; it is that "nothing documents this" and "nothing uses this" turn out to be the same
 * question asked from two sides.
 *
 * Scoped to TOP-LEVEL `Config` fields deliberately. Nested fields are documented in prose and tables
 * rather than by name, so demanding every one of them would report noise; the top level is the surface
 * an operator edits and the one where a field with no mention is genuinely lost.
 *
 * Run: node --test testing/standalone/config-key-docs-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const TYPES = join(ROOT, 'server', 'src', 'config', 'types.ts');

/**
 * Top-level fields the docs are not expected to name, each with why.
 *
 * Only machine-managed state qualifies: written by the app, never hand-edited, and meaningless to an
 * operator reading a guide. A setting does not belong here — the test below asserts each entry's own type
 * declaration says it is not hand-edited, so the list cannot quietly absorb one.
 */
const MACHINE_MANAGED = new Map([
  ['oauthClients', 'RFC 7591 dynamic client registrations, written by the MCP OAuth flow'],
  ['pendingSpaceOp', 'write-ahead marker for a multi-step space operation, cleared on commit'],
]);

/** Maps whose keys the USER chooses — not config fields. */
const FREE_FORM = new Set([
  'typeSchemas', 'properties', 'propertySchemas', 'spaceMap', 'headers', 'meta',
  'entity', 'memory', 'edge', 'chrono',
]);

function declaredFields() {
  const out = new Set();
  const sources = [TYPES, join(ROOT, 'server', 'src', 'db', 'backup-config.ts')].filter(existsSync);
  for (const f of sources) {
    const src = readFileSync(f, 'utf8');
    // Anywhere, not line-anchored — see the header note on inline object literals.
    for (const m of src.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\??\s*:/g)) out.add(m[1]);
    for (const m of src.matchAll(/['"]([a-zA-Z_][a-zA-Z0-9_]*)['"]\s*:/g)) out.add(m[1]);
  }
  return out;
}

function topLevelConfigFields() {
  const src = readFileSync(TYPES, 'utf8');
  const i = src.indexOf('export interface Config ');
  assert.ok(i >= 0, 'expected an `export interface Config` in config/types.ts');
  let depth = 0, start = src.indexOf('{', i), j = start;
  do { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; } while (depth > 0 && j < src.length);
  return new Set([...src.slice(start, j).matchAll(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\??\s*:/gm)].map(m => m[1]));
}

function collectKeys(value, out, skipping = false) {
  if (Array.isArray(value)) { for (const v of value) collectKeys(v, out, skipping); return out; }
  if (!value || typeof value !== 'object') return out;
  for (const [k, v] of Object.entries(value)) {
    if (!skipping) out.add(k);
    collectKeys(v, out, skipping || FREE_FORM.has(k));
  }
  return out;
}

/** Every fenced json block in docs/ whose top-level keys are all real Config fields. */
function configExamples() {
  const topLevel = topLevelConfigFields();
  const found = [];
  for (const f of readdirSync(join(ROOT, 'docs')).filter(n => n.endsWith('.md'))) {
    const src = readFileSync(join(ROOT, 'docs', f), 'utf8');
    for (const m of src.matchAll(/```json\s*\n([\s\S]*?)```/g)) {
      let parsed;
      try { parsed = JSON.parse(m[1]); } catch { continue; }   // samples with ellipses etc.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
      const roots = Object.keys(parsed);
      if (!roots.length || !roots.every(k => topLevel.has(k))) continue;
      found.push({ doc: f, parsed });
    }
  }
  return found;
}

describe('config.json examples in the docs name real fields', () => {
  it('still finds the config examples (the check itself works)', () => {
    // Without this, a change to the doc format or the Config interface would silently reduce the
    // sweep to zero blocks and the assertion below would pass by examining nothing.
    const examples = configExamples();
    assert.ok(examples.length >= 8,
      `expected to find config.json examples in docs/, found ${examples.length}`);
    assert.ok(declaredFields().size > 200, 'expected the config types to parse');
  });

  it('every key in every example is a declared config field', () => {
    const declared = declaredFields();
    const bad = [];
    for (const { doc, parsed } of configExamples()) {
      for (const k of collectKeys(parsed, new Set())) {
        if (!declared.has(k)) bad.push(`  ${k}  (in ${doc})`);
      }
    }
    assert.equal(bad.length, 0,
      'These keys appear in a documented config.json example but are declared nowhere in the config ' +
      'types. Unknown keys are IGNORED, so a reader would set them and see no effect:\n' +
      `${[...new Set(bad)].join('\n')}\n` +
      'Fix the doc, or add the field if it was meant to exist.');
  });
});

describe('every top-level config field is documented', () => {
  const docsText = readdirSync(join(ROOT, 'docs'))
    .filter(n => n.endsWith('.md'))
    .map(n => readFileSync(join(ROOT, 'docs', n), 'utf8'))
    .join('\n');

  it('finds the Config interface (the check itself works)', () => {
    // Same guard the sibling check carries: a parse that silently yields nothing would make the
    // assertion below pass by examining nothing, which is the failure mode of every coverage gate.
    assert.ok(topLevelConfigFields().size >= 20,
      `expected to parse the Config interface, found ${topLevelConfigFields().size} fields`);
  });

  it('names every one of them somewhere in docs/', () => {
    // Deliberately generous — a bare mention anywhere counts. Anything this reports is definitively
    // undocumented rather than merely documented somewhere surprising, so a finding is never a
    // judgement call about where a setting *should* be written up.
    const missing = [...topLevelConfigFields()]
      .filter(k => !MACHINE_MANAGED.has(k))
      .filter(k => !new RegExp(`\\b${k}\\b`).test(docsText));

    assert.deepEqual(missing, [],
      'These config fields exist but no doc mentions them, so an operator cannot find them:\n' +
      missing.map(k => `  ${k}`).join('\n') +
      '\nDocument them, or — if one turns out to be read by nothing — retire it explicitly.');
  });

  it('the machine-managed exemptions really are machine-managed', () => {
    // The failure this forecloses: exempting a genuine setting to make the check pass. Each entry has to
    // say so in its own doc comment, which is a claim a reviewer can check against the code.
    const src = readFileSync(TYPES, 'utf8');
    for (const [field, why] of MACHINE_MANAGED) {
      const at = src.search(new RegExp(`^\\s{2}${field}\\??\\s*:`, 'm'));
      assert.ok(at > 0, `${field} should be a top-level Config field (${why})`);
      // Normalised first: a JSDoc comment wraps, so the phrase routinely reads `not\n   * meant to be
      // hand-edited` and a `\s+` between the words does not match the leading asterisk.
      const comment = src.slice(Math.max(0, at - 700), at).replace(/^\s*\*/gm, ' ').replace(/\s+/g, ' ');
      assert.match(comment, /not\s+(meant to be\s+)?hand-edited/i,
        `${field} is exempted as machine-managed, so its declaration must say it is not hand-edited`);
    }
  });
});
