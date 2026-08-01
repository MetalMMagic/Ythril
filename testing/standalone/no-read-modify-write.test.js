/**
 * No Mongo path reads a document, awaits something, and then writes the document back.
 *
 * ## The shape
 *
 * A document is READ, something is AWAITED, and the same document is written back using values derived from the
 * read. The await is the window: a concurrent writer's change lands inside it and is silently clobbered by the
 * write that follows. Nothing errors, and the loser's change is simply gone.
 *
 * This is the database twin of #604, where a reference into `config.networks` was taken, a bcrypt hash was
 * awaited, and the push landed on an object the config reload had already replaced — a join that answered
 * success with the peer never recorded. That one was found by grepping for the config shape; this checks the
 * Mongo shape, which nothing had looked at.
 *
 * ## The result, and why the test exists anyway
 *
 * **Zero sites.** Every write in the data layer either uses an atomic operator (`$set` of fresh values, `$inc`,
 * `$max`, `$addToSet`), replaces a document built from scratch, or re-reads inside `mutateConfig` /
 * `findOneAndUpdate`. So this test passes on the code as it stands — which is exactly why it is worth keeping:
 * a clean sweep is a fact about today, and a gate is a fact about tomorrow. The self-tests below prove it can
 * fail, because a check that has never failed is indistinguishable from one that cannot.
 *
 * Run: node --test testing/standalone/no-read-modify-write.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_SRC = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'server', 'src');

/**
 * Blank comments IN PLACE, so reported line numbers stay true.
 *
 * An earlier scanner in this repo stripped comments instead and reported line numbers that pointed at the wrong
 * code — which made two innocent sites look guilty and cost the time to prove they were not.
 */
function blankComments(src) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') { state = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { state = 'block'; out += '  '; i += 2; continue; }
      if (c === '`' || c === '\'' || c === '"') { state = c === '`' ? 'tmpl' : c; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += c; } else out += ' '; i++; continue; }
    if (state === 'block') {
      if (c === '*' && d === '/') { state = 'code'; out += '  '; i += 2; continue; }
      out += (c === '\n' ? c : ' '); i++; continue;
    }
    if (c === '\\') { out += c + (d ?? ''); i += 2; continue; }
    if ((state === 'tmpl' && c === '`') || c === state) state = 'code';
    out += c; i++;
  }
  return out;
}

const READ = /(?:const|let)\s+(\w+)(?:\s*:[^=]+)?\s*=\s*(?:await\s+)?[^;]*\.findOne\(/;
const WRITE = /\.(updateOne|replaceOne|findOneAndUpdate)\(/;
const AWAIT = /\bawait\b/;

/**
 * Read-modify-write windows in one file's text, as `{ readLine, writeLine, variable, awaits }`.
 *
 * Scope-aware by brace depth: it stops at the end of the block the read was in, so a write in a *sibling*
 * block is not attributed to it. Without that, a function with an early-return read and an unrelated update
 * further down reads as a defect.
 */
export function findReadModifyWrite(text) {
  const lines = blankComments(text).split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const m = READ.exec(lines[i]);
    if (!m) continue;
    const variable = m[1];
    let depth = 0;
    let awaits = 0;
    for (let j = i + 1; j < Math.min(lines.length, i + 60); j++) {
      const l = lines[j];
      depth += (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length;
      if (depth < 0) break;
      if (AWAIT.test(l) && !WRITE.test(l)) awaits++;
      if (WRITE.test(l)) {
        const near = lines.slice(j, Math.min(lines.length, j + 4)).join(' ');
        if (new RegExp(`\\b${variable}\\b`).test(near) && awaits > 0) {
          hits.push({ readLine: i + 1, writeLine: j + 1, variable, awaits });
        }
        break;
      }
    }
  }
  return hits;
}

function serverFiles(dir = SERVER_SRC, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) serverFiles(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('no read-modify-write over a Mongo document', () => {
  it('finds none in the data layer', () => {
    const offenders = [];
    for (const file of serverFiles()) {
      for (const h of findReadModifyWrite(readFileSync(file, 'utf8'))) {
        const rel = file.slice(SERVER_SRC.length + 1).replace(/\\/g, '/');
        offenders.push(`${rel}:${h.readLine} → write at ${h.writeLine} (${h.awaits} await(s), '${h.variable}')`);
      }
    }
    assert.deepEqual(offenders, [], `a concurrent write can be clobbered here:\n  ${offenders.join('\n  ')}\n\n`
      + 'Use an atomic operator ($set of fresh values, $inc, $max, $addToSet), or re-read inside the write\n'
      + '(findOneAndUpdate / mutateConfig). The await between the read and the write is the window.');
  });

  it('scans a meaningful number of files — the scan itself still works', () => {
    // Without this, a broken walk would report zero offenders and look like a clean codebase.
    assert.ok(serverFiles().length > 100, `only walked ${serverFiles().length} files`);
  });

  // ── The detector must be able to fail ────────────────────────────────────────────────────────────
  it('DETECTS the shape it exists for', () => {
    const bad = `
      export async function bad(id) {
        const doc = await col('files').findOne(asFilter({ _id: id }));
        if (!doc) return;
        await somethingSlow();
        await col('files').updateOne(asFilter({ _id: id }), { $set: { tags: [...doc.tags, 'x'] } });
      }`;
    const hits = findReadModifyWrite(bad);
    assert.equal(hits.length, 1, 'the planted defect must be found');
    assert.equal(hits[0].variable, 'doc');
    assert.ok(hits[0].awaits >= 1);
  });

  it('does NOT flag a write with no await in the window', () => {
    // Read, then write immediately: no window, nothing can land in between.
    const fine = `
      export async function fine(id) {
        const doc = await col('files').findOne(asFilter({ _id: id }));
        await col('files').updateOne(asFilter({ _id: id }), { $set: { seen: doc.seen + 1 } });
      }`;
    assert.deepEqual(findReadModifyWrite(fine), []);
  });

  it('does NOT flag a write that ignores what was read', () => {
    // A read used only for a guard, then an atomic update of fresh values, is the correct pattern — flagging it
    // would make the gate one people delete.
    const fine = `
      export async function fine(id) {
        const existing = await col('files').findOne(asFilter({ _id: id }));
        if (!existing) return;
        await recomputeSomething();
        await col('files').updateOne(asFilter({ _id: id }), { $inc: { hits: 1 } });
      }`;
    assert.deepEqual(findReadModifyWrite(fine), []);
  });

  it('does not attribute a write in a sibling block to an earlier read', () => {
    const fine = `
      export async function fine(id) {
        if (a) {
          const doc = await col('files').findOne(asFilter({ _id: id }));
          if (!doc) return;
        }
        await other();
        await col('files').updateOne(asFilter({ _id: id }), { $set: { doc: 1 } });
      }`;
    assert.deepEqual(findReadModifyWrite(fine), []);
  });

  it('is not fooled by the shape appearing inside a comment', () => {
    // The comments in this repo describe these defects at length. A scanner that reads them finds itself.
    const fine = `
      // const doc = await col('files').findOne(...);
      // await slow();
      // await col('files').updateOne(..., { $set: { x: doc.x } });
      export async function fine() { return 1; }`;
    assert.deepEqual(findReadModifyWrite(fine), []);
  });
});
