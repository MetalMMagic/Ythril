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
 * Run: node --test testing/standalone/config-key-docs-coverage.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const TYPES = join(ROOT, 'server', 'src', 'config', 'types.ts');

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
