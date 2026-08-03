/**
 * A database dump is the whole database in plaintext. Treat it that way, and say so.
 *
 * ## The finding — Privacy audit lens
 *
 * `02-hosting.md` has a section titled **Encryption at Rest**. It is scoped correctly in its own text — four state
 * files — and it recommends an encrypted `mongod` for brain data. An operator who does all of that has, reasonably,
 * concluded their data at rest is protected.
 *
 * A backup bypasses the whole arrangement. `dumpDatabase` reads **through** `mongod`, so the NDJSON that lands in
 * `<data-root>/backups/` is **decrypted**: every memory, entity, edge, chrono entry, file-meta record and audit
 * entry, in the clear, on the same volume. `requireEncryptedAtRest` does not touch it. Nothing said so.
 *
 * And the permissions were inverted with respect to sensitivity: the four state files have always been written
 * `0600`, while the dump directory was created with `mkdirSync(dir, { recursive: true })` — default `0755`, files
 * `0644`. **The least sensitive thing on the volume was the best protected.** The offsite copy, which additionally
 * contains every uploaded file verbatim, was the same.
 *
 * ## What this gate holds
 *
 * The modes, and the fact that the docs admit the gap. It cannot check the deeper question — whether dumps should be
 * *encrypted* — because that is a live trade-off parked for the owner: encrypting them with the master key makes a
 * backup unrestorable without that key, which is either the point or a foot-gun depending on why it was taken.
 *
 * Run: node --test testing/standalone/backups-are-not-world-readable.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Every `mkdirSync` in a file, with its options text — so a missing `mode` is visible. */
function mkdirs(src) {
  return [...src.matchAll(/fs\.mkdirSync\(([^;]*?)\);/gs)].map(m => m[1].replace(/\s+/g, ' ').trim());
}

describe('a dump is written as tightly as the state files it sits beside', () => {
  const dump = read('server/src/db/dump.ts');
  const offsite = read('server/src/db/offsite.ts');

  it('found the writers — the parse still matches', () => {
    assert.ok(mkdirs(dump).length >= 1, 'no mkdirSync found in dump.ts');
    assert.ok(mkdirs(offsite).length >= 2, `expected both offsite copies, found ${mkdirs(offsite).length}`);
  });

  it('every backup directory is created 0700', () => {
    const loose = [];
    for (const [file, src] of [['dump.ts', dump], ['offsite.ts', offsite]]) {
      for (const call of mkdirs(src)) {
        if (!/mode:\s*0o700/.test(call)) loose.push(`${file}: fs.mkdirSync(${call})`);
      }
    }
    assert.deepEqual(loose, [], 'these create a directory holding a plaintext copy of the database — or of every '
      + `uploaded file — with default permissions, typically 0755:\n  ${loose.join('\n  ')}`);
  });

  it('the NDJSON files themselves are written 0600', () => {
    // The directory mode is not enough on a host where an existing directory is reused, and `cpSync` preserves
    // source file modes — so the FILE mode is what actually travels offsite.
    const streams = [...dump.matchAll(/createWriteStream\(([^;]*?)\);/gs)].map(m => m[1].replace(/\s+/g, ' '));
    assert.ok(streams.length >= 1, 'no createWriteStream found in dump.ts');
    for (const s of streams) {
      assert.match(s, /mode:\s*0o600/,
        `a collection dump is written without a restrictive mode: createWriteStream(${s})`);
    }
  });

  it('a non-POSIX host cannot make the chmod fatal', () => {
    // Windows and some network shares do not honour POSIX modes. Hardening must not turn a working backup into a
    // failed one — the mode is a tightening, not a precondition.
    for (const [file, src] of [['dump.ts', dump], ['offsite.ts', offsite]]) {
      for (const m of src.matchAll(/fs\.chmodSync\([^)]*\)/g)) {
        const around = src.slice(Math.max(0, src.indexOf(m[0]) - 120), src.indexOf(m[0]) + m[0].length + 80);
        assert.match(around, /try\s*\{/, `${file}: ${m[0]} is not guarded — a non-POSIX host would fail the backup`);
      }
    }
  });
});

describe('the docs admit what encryption at rest does not cover', () => {
  it('the admin API says a dump is unencrypted and not covered by the flag', () => {
    const doc = read('docs/integration-guide/12-admin-api.md');
    assert.match(doc, /unencrypted copy of everything/i,
      'the backup endpoint must say the dump is unencrypted');
    assert.match(doc, /requireEncryptedAtRest.{0,40}does not cover it/i,
      'it must say explicitly that the at-rest flag does not cover a dump — that is the assumption being corrected');
    assert.match(doc, /decrypted/i,
      'it must explain WHY: the dump reads through mongod, so an encrypted mongod does not help');
  });

  it('the Encryption at Rest section scopes itself', () => {
    // The section was accurate and its TITLE was broader than its content. A reader who stops at the heading is the
    // one this is for.
    const doc = read('docs/integration-guide/02-hosting.md');
    const at = doc.indexOf('### Encryption at Rest');
    assert.ok(at > 0, 'the Encryption at Rest section is gone');
    const section = doc.slice(at, doc.indexOf('\n### ', at + 10));
    assert.match(section, /does NOT cover/,
      'the section must state what it does not cover — uploads, backups, and brain data in MongoDB');
    assert.match(section, /backups/i, 'backups must be named among the exclusions');
    assert.match(section, /files/i, 'uploaded files must be named among the exclusions');
  });
});
