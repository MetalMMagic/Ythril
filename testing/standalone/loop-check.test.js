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

| # | What | Home | Status | Remark |
|---|------|------|--------|--------|
| Q-2 | suppressEmbeddings per type | QA | in progress | tier resolver merged |
| Q-3 | Split config/types.ts | ARCH | open | |
| Q-4 | Authenticate CI compose pull | ARCH | open | measure first |

## Watching

| # | What | Home | Status | Remark |
|---|------|------|--------|--------|
| W-1 | Mongo boot race | QA | watching | |

## Parked

| # | What | Home | Status | Remark |
|---|------|------|--------|--------|
| P-1 | F11-b assist model | FEAT | parked | owner decision |
`;

describe('the queue rows', () => {
  it('counts the Q- tier and nothing else', () => {
    // W- and P- rows are why the file can be "drained" while still listing things. Counting them would make
    // the queue permanently non-empty, and "cut the tag when the queue is empty" unreachable — the same defect
    // the retired `behind the tag` tier had.
    assert.deepEqual(parseRows(TABLE).map((r) => r.id), ['Q-2', 'Q-3', 'Q-4']);
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
    const done = TABLE.replace('| Q-3 | Split config/types.ts | ARCH | open |', '| Q-3 | Split config/types.ts | ARCH | shipped |');
    assert.deepEqual(parseRows(done).map((r) => r.id), ['Q-2', 'Q-4']);
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
