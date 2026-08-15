/**
 * `loop:check` must fire on the state that actually happened.
 *
 * The gate exists because the loop kept stopping with work available and nothing in flight. So the one case
 * that matters is the one it was written for: **rows open, no PR** must be a refusal. A gate for a repeated
 * mistake that does not fire on that exact mistake is decoration.
 *
 * The two parsing helpers are tested rather than the CLI, because the verdict is trivial once they are right
 * and both of them have already been wrong once — the status-prefix strip ate the first letter of `package.json`
 * on its first run.
 *
 * Run: node --test testing/standalone/loop-check.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRows, sourceFiles } from '../../scripts/loop-check.mjs';

const TABLE = `# Ordered queue

## 1 · Open work, in shipping order

| # | Task | Home | Status | Remark |
|---|------|------|--------|--------|
| Q-2 | suppressEmbeddings per type | QA | in progress | tier resolver merged |
| B-3 | Split config/types.ts | ARCH | open | |
| U-9 | token rights: admin edit tier | UX | tiers 1+3 done, #840 shipped the self-view | own PR |
| W-8 | Dockerfile still fetches CUDA | QA | fixed in CI, owner call on the image | 3x npm ci |
| RX-1 | Reindex reports the ACK as a result | UI | open | two-letter domain key |
| P0-1 | Rights matrix save rejected | UI | open | letter+digit priority key |
| D-8d | Unify scope, delete legacy fields | DEPR | open | sub-item suffix |

## 2 · Watch items — NOT work

| # | Watch item | Home | Status | Remark |
|---|------|------|--------|--------|
| W-1 | Mongo boot race | QA | watching | |

## 3 · Parked — an owner decision is missing

| # | What | Home | Status | Remark |
|---|------|------|--------|--------|
| P-1 | F11-b assist model | FEAT | parked | owner decision |

## 4 · The release

| # | What | Home | Status | Remark |
|---|------|------|--------|--------|
| R-1 | Cut the tag | LOOP | after the drain | |
`;

describe('the queue rows', () => {
  it('counts every ID prefix the open section uses', () => {
    // The bug this replaced: the filter was `id.startsWith('Q-')`, from a period when every row was a `Q-`. The
    // queue was later re-keyed per domain — `B-` architecture, `U-` UX, `T-` sync — and the gate went on counting
    // a prefix that no longer existed. It reported "the queue is drained" with eleven rows open, which is the
    // exact state it was written to refuse, and it reported it in green.
    assert.deepEqual(parseRows(TABLE).map((r) => r.id), ['Q-2', 'B-3', 'U-9', 'W-8', 'RX-1', 'P0-1', 'D-8d']);
  });

  it('counts an ID that is not one letter and one number', () => {
    // The SAME under-count, one regex further along. `^[A-Z]-\d+$` described every ID that existed when it was
    // written, and the queue then keyed rows by domain initials (`RX-`, `EJ-`, `SA-`), by priority (`P0-`) and by
    // sub-item (`D-8d`). On 2026-08-15 the file held eleven open rows and the gate reported two — in the same
    // direction as the prefix bug, which is the direction that says "drained" on a full queue.
    const ids = parseRows(TABLE).map((r) => r.id);
    assert.ok(ids.includes('RX-1'), 'a two-letter domain key is a row');
    assert.ok(ids.includes('P0-1'), 'a letter+digit priority key is a row');
    assert.ok(ids.includes('D-8d'), 'a sub-item suffix is a row');
  });

  it('still refuses cells that are not IDs at all', () => {
    // The looseness has to stop somewhere, or a header cell or a stray prose table elsewhere in the file becomes
    // work. Anything without the `<KEY>-<number>` shape is not a row.
    const noise = ['| # | Task | Home | Status |', '| Total | 11 | | |', '| see D-8 | note | | |', '| 8d | x | | |']
      .join('\n');
    assert.deepEqual(parseRows(noise), []);
  });

  it('reads the SECTION, not the prefix — so a W- row of real work counts', () => {
    // `W-8` is open work that happens to carry a watch-tier ID, because its home tracker keyed it that way. Under
    // the old prefix rule it was invisible; under the section rule it counts, and `W-1` two headings down does not.
    // Membership is where a row was filed, which is the thing the owner actually maintains.
    const ids = parseRows(TABLE).map((r) => r.id);
    assert.ok(ids.includes('W-8'), 'a W- row inside the open section is work');
    assert.ok(!ids.includes('W-1'), 'a W- row under Watch items is not');
  });

  it('excludes the watch, parked and release sections', () => {
    // These are why the file can be "drained" while still listing things. Counting them would make the queue
    // permanently non-empty, and "cut the tag when the queue is empty" unreachable — the same defect the retired
    // `behind the tag` tier had.
    const ids = parseRows(TABLE).map((r) => r.id);
    assert.ok(!ids.includes('P-1'));
    assert.ok(!ids.includes('R-1'));
  });

  it('counts rows that appear before any heading', () => {
    // A bare table with no `##` above it is the shape every earlier version of this file had, and the shape a
    // hand-written fixture takes. Defaulting an unlabelled section to CLOSED would silently drain the queue.
    assert.deepEqual(parseRows('| B-1 | a thing | ARCH | open | |\n').map((r) => r.id), ['B-1']);
  });

  it('keeps what the next row IS, so the refusal can name it', () => {
    const first = parseRows(TABLE)[0];
    assert.equal(first.what, 'suppressEmbeddings per type');
    assert.equal(first.status, 'in progress');
  });

  it('does not read the header or the separator as tasks', () => {
    assert.equal(parseRows('| # | What | Home | Status |\n|---|---|---|---|\n').length, 0);
  });

  it('a row marked done is not open', () => {
    // The queue is what is left, not what was listed. `todo/` is supposed to hold open items only, but a status
    // cell is the one place a shipped row can linger before the tracker reconcile catches it.
    const done = TABLE.replace('| B-3 | Split config/types.ts | ARCH | open |', '| B-3 | Split config/types.ts | ARCH | shipped (#812) |');
    assert.deepEqual(parseRows(done).map((r) => r.id), ['Q-2', 'U-9', 'W-8', 'RX-1', 'P0-1', 'D-8d']);
  });

  it('a status reporting PARTIAL progress is still open', () => {
    // The second under-count, and the more dangerous one because it fires on healthy rows. The test was
    // `/\b(done|shipped|merged)\b/` anywhere in the cell, so `2 wrappers shipped (#842, #843)` — a row three
    // fifths finished — read as finished, as did `tiers 1+3 done, #840 shipped the self-view`. A partially
    // shipped row is the most common status in this file.
    const partial = TABLE.replace('| B-3 | Split config/types.ts | ARCH | open |', '| B-3 | Split config/types.ts | ARCH | 2 wrappers shipped (#842, #843) |');
    assert.ok(parseRows(partial).map((r) => r.id).includes('B-3'));
    assert.ok(parseRows(TABLE).map((r) => r.id).includes('U-9'), 'tiers 1+3 done, #840 shipped ... is open work');
  });

  it('treats a done marker with prose after it as open', () => {
    // Deliberately conservative: over-counting makes the gate say "keep working", under-counting makes it say
    // "drained" on a queue that is not. Only one of those two failures is survivable, so anything the rule cannot
    // read as unambiguously finished stays in the queue.
    const hedged = TABLE.replace('| B-3 | Split config/types.ts | ARCH | open |', '| B-3 | Split config/types.ts | ARCH | done except the migration |');
    assert.ok(parseRows(hedged).map((r) => r.id).includes('B-3'));
  });

  it('an empty file is a drained queue, not a parse failure', () => {
    assert.deepEqual(parseRows(''), []);
    assert.deepEqual(parseRows('# Ordered queue\n\nNothing open.\n'), []);
  });
});

describe('the dirty-tree read', () => {
  it('strips the status prefix for every column combination', () => {
    // The bug this test is here for: a fixed `slice(3)` reported `ackage.json`, because git pads a
    // single-column status differently depending on which slot is set.
    assert.deepEqual(
      sourceFiles('M  package.json\n M server/src/a.ts\n?? scripts/b.mjs\nMM client/src/c.html'),
      ['package.json', 'server/src/a.ts', 'scripts/b.mjs', 'client/src/c.html'],
    );
  });

  it('survives a caller that trimmed the whole output', () => {
    // The actual bug, and the reason the first version of this test passed while the script was broken: the
    // helper feeding it ran `.trim()` on the aggregate `git status` output, which eats the leading space of the
    // FIRST line only. So line one arrives with one status column and every later line with two — the script
    // reported `ackage.json` while a test fed well-formed porcelain and saw nothing wrong.
    assert.deepEqual(
      sourceFiles('M package.json\n?? scripts/b.mjs'),
      ['package.json', 'scripts/b.mjs'],
    );
  });

  it('takes the NEW path of a rename', () => {
    assert.deepEqual(sourceFiles('R  old/a.ts -> new/a.ts'), ['new/a.ts']);
  });

  it('ignores todo/, because the trackers are gitignored bookkeeping', () => {
    // A tracker edit is precisely what must NOT count as work in progress — treating it as such would let the
    // gate pass on the exact state it exists to refuse.
    assert.deepEqual(sourceFiles('M  todo/_TODO-ORDERED.md'), []);
  });

  it('ignores files that are not source', () => {
    assert.deepEqual(sourceFiles('?? notes.txt\n?? shot.png'), []);
  });

  it('reports nothing for a clean tree', () => {
    assert.deepEqual(sourceFiles(''), []);
  });
});
