/**
 * No boot migration may write to a collection that replicates across a network.
 *
 * ## The rule, which is already written down and enforced by nothing
 *
 * `docs/contribution-guide.md`:
 *
 * > **Synced data → self-healing (lazy), never a one-time boot migration.** The per-space MongoDB record
 * > collections that replicate across networks — memories, entities, edges, chrono, `{space}_files`, and their
 * > fields — can be silently reverted by a **mixed-version peer**: an older-version instance that rewrites a
 * > record with a higher `seq` replaces the *whole* document and undoes any boot migration. So don't migrate
 * > these on boot — **repair or derive the field on access**, so it re-heals after any cross-version clobber.
 *
 * ## Why it needs a gate rather than discipline
 *
 * **The failure is invisible to every single-instance test.** A boot migration over `{space}_files` works
 * perfectly on one instance: it runs, the field is right, every test passes. It only breaks in a network, only
 * when a peer is on an older build, and it breaks by *silently reverting data* — no error, no log line, no
 * failing assertion. The one place it would be caught is a multi-version network, which nobody has in CI.
 *
 * The canary operates **five instances off one manifest**. They upgrade together today, which is exactly why
 * nobody would notice this rule being broken until a network spans two organisations that do not.
 *
 * The rule is currently **held**: every write to a synced collection sits on a user-action path (delete, wipe,
 * the media pipeline, the face embedder), and the one migration-shaped thing at boot — token `prefix` backfill —
 * is explicitly self-healing on first use, with a comment in `index.ts` saying so. This gate exists to keep that
 * true, not to fix it.
 *
 * ## What it can and cannot see, stated rather than implied
 *
 * It checks two populations: functions **named** `migrate*`, and the functions `index.ts` calls in its startup
 * sequence. A boot migration that is neither named `migrate*` nor called directly from `index.ts` would slip
 * through. That is a real limit, not a covered case — the mitigation is that the naming convention is the one
 * contributors already follow (four of four current migrations use it) and that the startup sequence is short
 * enough to enumerate.
 *
 * Run: node --test testing/standalone/no-boot-migration-on-synced-data.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

/** The collections that replicate. Named in the contribution guide; this list must match it. */
const SYNCED = ['memories', 'entities', 'edges', 'chrono', 'files'];

/** Mutating Mongo operations. A read never reverts anything, so a boot-time read is fine. */
const WRITES = ['updateMany', 'updateOne', 'bulkWrite', 'deleteMany', 'deleteOne', 'insertMany', 'insertOne',
  'replaceOne', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete'];

function sourceFiles() {
  const tracked = execFileSync('git', ['ls-files', 'server/src/**/*.ts'], { cwd: ROOT, encoding: 'utf8' });
  const fresh = execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'server/src/**/*.ts'],
    { cwd: ROOT, encoding: 'utf8' });
  return [...new Set(`${tracked}\n${fresh}`.split(/\r?\n/))].filter(Boolean).map(p => p.replace(/\\/g, '/'));
}

/** Comments stripped line-first, so the gate cannot fire on the prose that documents it. */
function code(path) {
  return readFileSync(join(ROOT, path), 'utf8')
    .split(/\r?\n/)
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
}

/** Extract `name -> body` for every top-level function in a file, by brace matching. */
function functions(src) {
  const out = new Map();
  for (const m of src.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)[^{]*\{/gm)) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    out.set(m[1], src.slice(start, i + 1));
  }
  return out;
}

/** Does this function body write to a synced collection? Returns the offending fragment, or null. */
function writesSynced(body) {
  for (const coll of SYNCED) {
    // `col(...)` / `col<T>(...)` naming a synced collection, followed by a mutating call.
    const re = new RegExp(`_${coll}\`\\s*\\)?\\s*[\\s\\S]{0,80}?\\.(${WRITES.join('|')})\\b`);
    const m = re.exec(body);
    if (m) return `${coll}: .${m[1]}()`;
  }
  return null;
}

/** Functions index.ts invokes in its startup sequence, before the server begins serving. */
function bootCallees() {
  const src = code('server/src/index.ts');
  const listen = src.search(/\.listen\(|startServer\(/);
  const startup = listen > 0 ? src.slice(0, listen) : src;
  const names = new Set();
  for (const m of startup.matchAll(/(?:await\s+)?([a-z][\w$]*)\s*\(\s*\)/g)) names.add(m[1]);
  return names;
}

describe('the sweep works before it is trusted', () => {
  it('finds the migrate* functions', () => {
    const found = [];
    for (const f of sourceFiles()) {
      for (const name of functions(code(f)).keys()) if (/^migrate/.test(name)) found.push(name);
    }
    // Four exist today. A floor of 3 leaves room for one to be retired without the gate going quiet.
    assert.ok(found.length >= 3, `expected the migrate* functions, found ${JSON.stringify(found)}`);
    assert.ok(found.includes('migrateStateFilesAtRest'),
      'the known migration set is not being found, so this gate is checking nothing');
  });

  it('finds the startup call sequence', () => {
    const callees = bootCallees();
    assert.ok(callees.size >= 4, `only ${callees.size} startup calls found; the enumeration broke`);
    assert.ok(callees.has('loadConfig'), 'loadConfig is not in the startup sequence — the parse is wrong');
  });

  it('and it can actually detect a violation — the detector is tested, not assumed', () => {
    // A gate whose detector is never exercised is a gate that passes because it finds nothing, which is
    // indistinguishable from passing because there is nothing to find.
    const fake = 'function migrateSomething() {\n'
      + '  await col(`${space.id}_files`).updateMany({}, { $set: { x: 1 } });\n}';
    assert.ok(writesSynced(fake), 'the detector cannot see a plain updateMany on a synced collection');
    const safeRead = 'function migrateSomething() {\n'
      + '  const n = await col(`${space.id}_files`).countDocuments({});\n}';
    assert.equal(writesSynced(safeRead), null, 'the detector flags a READ, which reverts nothing');
  });
});

describe('no boot migration writes to a synced collection', () => {
  it('no migrate* function does', () => {
    const offenders = [];
    for (const f of sourceFiles()) {
      for (const [name, body] of functions(code(f))) {
        if (!/^migrate/.test(name)) continue;
        const hit = writesSynced(body);
        if (hit) offenders.push(`${f} → ${name}() writes ${hit}`);
      }
    }
    assert.deepEqual(offenders, [], 'a boot migration writes to a collection that replicates across networks. An '
      + 'older peer rewriting one of those records replaces the WHOLE document and silently undoes the '
      + 'migration — with no error, no log line, and every single-instance test still green.\n  '
      + offenders.join('\n  ')
      + '\n\nRepair or derive the field ON ACCESS instead, so it re-heals after a cross-version clobber. See '
      + 'the token `prefix` backfill in index.ts for the shape.');
  });

  it('nor does anything index.ts calls during startup', () => {
    const callees = bootCallees();
    const offenders = [];
    for (const f of sourceFiles()) {
      for (const [name, body] of functions(code(f))) {
        if (!callees.has(name)) continue;
        const hit = writesSynced(body);
        if (hit) offenders.push(`${f} → ${name}() writes ${hit}`);
      }
    }
    assert.deepEqual(offenders, [], 'a function called during startup writes to a synced collection:\n  '
      + offenders.join('\n  '));
  });
});

describe('the rule and the gate move together', () => {
  it('the contribution guide still states the rule this gate enforces', () => {
    // A gate outliving its documented rule is a gate nobody can argue with. If the rule is deliberately
    // changed, this failing is the prompt to change the gate in the same commit — not to delete this assertion.
    const doc = readFileSync(join(ROOT, 'docs/contribution-guide.md'), 'utf8');
    assert.match(doc, /never a one-time boot migration/i,
      'the synced-data migration rule is gone from the contribution guide, but this gate still enforces it');
    for (const coll of SYNCED) {
      assert.ok(doc.includes(coll),
        `the guide no longer names \`${coll}\` as a synced collection, so this gate's list may be out of date`);
    }
  });
});
