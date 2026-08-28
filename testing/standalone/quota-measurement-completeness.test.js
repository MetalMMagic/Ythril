/**
 * A storage measurement must be able to say it could not read everything.
 *
 * ## The defect this pins
 *
 * `measureDirSize`'s predecessor returned a bare number, and every failure inside it contributed 0: a directory
 * the process cannot list returned early, a file it cannot stat was skipped, and a refused `dbStats` returned 0
 * bytes of brain data. So the usage came back LOWER than reality with nothing logged — and a hard limit compared
 * against a number that is only a floor never fires. An operator who configured a quota then sees a quota that
 * simply never triggers, which from the outside is indistinguishable from being under it.
 *
 * `metrics/registry.ts` had already reasoned this out one layer up for the same quantity: the storage gauge
 * emits NO series rather than a zero, because *"an absent series says 'not measured yet' where a zero would have
 * claimed 'empty'"*. That rule was right and it stopped at the gauge. One rule, two implementations, and the
 * weaker one was the one the quota consulted.
 *
 * ## What is asserted, and what is deliberately not
 *
 * An ABSENT root is a complete answer of zero — a space with no files directory yet uses no files, and calling
 * that unmeasurable would put every fresh instance permanently in the degraded state. So the two cases have to
 * be told apart, and both directions are pinned: absent → complete, unreadable → incomplete.
 *
 * It still fails OPEN. A transient `EIO` on one subdirectory must not refuse writes on an otherwise healthy
 * instance, so nothing here asserts a refusal — only that the allow is no longer silent.
 *
 * Run: node --test testing/standalone/quota-measurement-completeness.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { measureDirSize, dirSizeBytes } from '../../server/dist/quota/quota.js';

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'ythril-quota-'));

before(() => {
  fs.mkdirSync(path.join(ROOT, 'present', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'present', 'a.bin'), Buffer.alloc(1024));
  fs.writeFileSync(path.join(ROOT, 'present', 'nested', 'b.bin'), Buffer.alloc(2048));
});

after(() => {
  fs.rmSync(ROOT, { recursive: true, force: true });
});

describe('measureDirSize reports what it read AND what it could not', () => {
  it('sums a readable tree and reports nothing unreadable', async () => {
    const r = await measureDirSize(path.join(ROOT, 'present'));
    assert.equal(r.bytes, 3072, 'the walk must sum every file it can read, at any depth');
    assert.deepEqual(r.unreadable, [], 'a fully readable tree is not incomplete');
  });

  it('an ABSENT root is a complete answer of zero, not an unmeasurable one', async () => {
    /*
     * The direction that matters as much as the other. A space that has never held a file has no files
     * directory, and treating that as "could not measure" would put every fresh instance into the degraded
     * state permanently — the alert would fire on the healthy case and be turned off.
     */
    const r = await measureDirSize(path.join(ROOT, 'no-such-directory'));
    assert.equal(r.bytes, 0);
    assert.deepEqual(r.unreadable, [], 'an absent root means "nothing stored here", which is a complete answer');
  });

  it('a file that vanishes between listing and stat is reported, not skipped silently', async () => {
    /*
     * Provoked rather than mocked: a name is listed by `readdir` and removed before `stat` reaches it. That is
     * the race the old `catch { /* skip *\\/ }` swallowed, and it is also what a permission failure looks like
     * from inside the walk — the walk cannot tell them apart, and either way the bytes are missing.
     */
    const dir = path.join(ROOT, 'racing');
    fs.mkdirSync(dir, { recursive: true });
    const doomed = path.join(dir, 'vanishes.bin');
    fs.writeFileSync(doomed, Buffer.alloc(4096));

    const realStat = fs.promises.stat;
    fs.promises.stat = async (p, ...rest) => {
      if (String(p) === doomed) {
        const err = new Error('ENOENT: no such file or directory');
        err.code = 'ENOENT';
        throw err;
      }
      return realStat.call(fs.promises, p, ...rest);
    };
    try {
      const r = await measureDirSize(dir);
      assert.equal(r.bytes, 0, 'the vanished file contributes nothing, which is correct');
      assert.equal(r.unreadable.length, 1, 'and it must be REPORTED, or the total silently reads as complete');
      assert.match(r.unreadable[0], /vanishes\.bin/, 'the report must name the path');
      assert.match(r.unreadable[0], /ENOENT/, 'and the reason, or an operator cannot act on it');
    } finally {
      fs.promises.stat = realStat;
    }
  });

  it('an unlistable directory is reported, and its subtree is not counted as empty', async () => {
    const dir = path.join(ROOT, 'refused');
    fs.mkdirSync(path.join(dir, 'inner'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'inner', 'c.bin'), Buffer.alloc(8192));

    /*
     * `chmod` is a no-op on Windows, so the refusal is provoked at the `readdir` boundary instead of through the
     * filesystem. What is being asserted is the walk's HANDLING of a refusal, which is the same code path on
     * every platform; asserting that a particular chmod produces EACCES would be asserting something about the
     * host rather than about Ythril.
     */
    const realReaddir = fs.promises.readdir;
    fs.promises.readdir = async (p, ...rest) => {
      if (String(p) === path.join(dir, 'inner')) {
        const err = new Error('EACCES: permission denied');
        err.code = 'EACCES';
        throw err;
      }
      return realReaddir.call(fs.promises, p, ...rest);
    };
    try {
      const r = await measureDirSize(dir);
      assert.equal(r.bytes, 0, 'nothing under the refused directory can be counted');
      assert.equal(r.unreadable.length, 1);
      assert.match(r.unreadable[0], /EACCES/, 'a refusal deeper than the root is incompleteness, not zero');
      assert.doesNotMatch(r.unreadable[0], /^undefined/, 'the reason must survive into the report');
    } finally {
      fs.promises.readdir = realReaddir;
    }
  });

  it('dirSizeBytes still answers with the number alone, for callers that only report a size', async () => {
    // The compatibility half: two callers report a footprint and have no limit to compare it against.
    assert.equal(await dirSizeBytes(path.join(ROOT, 'present')), 3072);
  });
});
