/**
 * An MCP refusal carries its structure, not just a sentence about it.
 *
 * ## The finding
 *
 * A schema refusal distinguishes violations the write **introduced** from ones the record **already had** —
 * the distinction that lets a caller tell "fix your patch" from "this record was already broken here, and
 * your write is the moment to repair it". The REST routes answer with both arrays. Over MCP, which is the
 * primary write path for this product, it survived only as prose:
 *
 *  - the create/upsert tools glued `JSON.stringify(violations)` onto the end of the message, so a caller had
 *    to split a string to reach it, and the introduced/pre-existing split was not in there at all;
 *  - the update tools threw a plain `Error`, and the router turned it into one line of text — the arrays
 *    were computed, used to write the sentence, and dropped.
 *
 * Reported by the canary as a minor point. The gating question was whether an MCP tool result can carry
 * structured data at all: **it can** — `structuredContent` is optional on `CallToolResult` in the pinned SDK
 * (1.28.0), and unvalidated when a tool declares no `outputSchema`, so a client that ignores it loses
 * nothing because `content` remains the whole answer.
 *
 * ## What this pins
 *
 * Every schema refusal in the MCP layer carries `structuredContent`, enumerated out of the tool sources
 * rather than listed here — the create paths were four separate near-identical sites, which is exactly the
 * shape that lets one be missed.
 *
 * Run: node --test testing/standalone/mcp-structured-errors.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

let SchemaViolationError;

const NUL = String.fromCharCode(0);
const toolFiles = execFileSync('git', ['ls-files', '-z', 'server/src/mcp/tools'], { encoding: 'utf8' })
  .split(NUL).filter(f => f.endsWith('.ts'));
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the refusal keeps its classification', () => {
  before(async () => {
    ({ SchemaViolationError } = await import('../../server/dist/brain/write-validation.js'));
  });

  it('SchemaViolationError carries the arrays, not just the message', () => {
    const err = new SchemaViolationError({
      blocked: true,
      message: 'introduced: status; pre-existing: owner',
      introduced: [{ field: 'status', reason: 'required' }],
      preExisting: [{ field: 'owner', reason: 'required' }],
      all: [{ field: 'status', reason: 'required' }, { field: 'owner', reason: 'required' }],
      warnings: [],
    });
    assert.ok(err instanceof Error, 'it must still be throwable and catchable as an Error');
    assert.match(err.message, /^schema_violation: /, 'the thrown message is unchanged for existing callers');
    const s = err.toStructured();
    assert.equal(s.error, 'schema_violation');
    assert.deepEqual(s.introduced, [{ field: 'status', reason: 'required' }]);
    assert.deepEqual(s.preExisting, [{ field: 'owner', reason: 'required' }]);
    assert.equal(s.violations.length, 2);
  });

  it('the router attaches it once, for every tool, rather than each tool doing it', () => {
    // Twelve-odd write tools funnel through one catch. Attaching per tool is how the REST routes came to
    // report the split while this transport did not.
    const router = strip(readFileSync('server/src/mcp/router.ts', 'utf8'));
    assert.match(router, /err instanceof SchemaViolationError \? err\.toStructured\(\) : undefined/);
    assert.match(router, /\.\.\.\(structuredContent \? \{ structuredContent \} : \{\}\)/,
      'a non-schema error must not grow an empty structuredContent field');
  });

  it('assertUpdateAllowed throws the typed error, so no update tool has to know', () => {
    const wv = strip(readFileSync('server/src/brain/write-validation.ts', 'utf8'));
    assert.match(wv, /throw new SchemaViolationError\(check\)/);
    assert.ok(!/throw new Error\(`schema_violation/.test(wv), 'the plain-Error throw is what dropped the arrays');
  });

  it('NO tool still glues a stringified violation array onto its message', () => {
    // Enumerated from the tool sources: four near-identical create paths did this, and a fifth added later
    // would be caught here rather than by a customer reading a message.
    const offenders = [];
    for (const f of toolFiles) {
      const src = strip(readFileSync(f, 'utf8'));
      src.split(/\r?\n/).forEach((line, i) => {
        if (/text:.*schema_violation/.test(line) && /JSON\.stringify/.test(line)) {
          offenders.push(`${f.split('\\').join('/')}:${i + 1}`);
        }
      });
    }
    assert.deepEqual(offenders, [],
      'put the violations in structuredContent, not in the text:\n  ' + offenders.join('\n  '));
  });

  it('every schema refusal in a tool DOES carry structuredContent', () => {
    // The other direction of the same rule: a refusal with neither the JSON tail nor structured content
    // would pass the test above while telling a caller less than before.
    const missing = [];
    for (const f of toolFiles) {
      const src = strip(readFileSync(f, 'utf8'));
      // Each `text: …schema_violation…` return should have a structuredContent within a few lines.
      const lines = src.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!/text:.*schema_violation/.test(line)) return;
        const window = lines.slice(Math.max(0, i - 3), i + 4).join(' ');
        if (!window.includes('structuredContent')) missing.push(`${f.split('\\').join('/')}:${i + 1}`);
      });
    }
    assert.deepEqual(missing, [],
      'these refuse without machine-readable detail:\n  ' + missing.join('\n  '));
  });

  it('the result type declares it, so a tool cannot add it by accident', () => {
    const types = strip(readFileSync('server/src/mcp/tools/types.ts', 'utf8'));
    assert.match(types, /structuredContent\?: Record<string, unknown>/);
  });
});
