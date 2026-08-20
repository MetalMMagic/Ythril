/**
 * The file-mutation tools say what happens BESIDES the obvious, and each claim is pinned to the code.
 *
 * ## What was missing
 *
 * Three one-line descriptions — *"Move or rename a file or directory"*, *"Delete a file from the space file
 * store"*, *"Create a directory (and any required parents)"* — each of which is true and none of which says
 * the thing a caller gets wrong.
 *
 * - **`delete_file` is a CASCADE and it is IDEMPOTENT.** It cancels queued media jobs, removes conversion
 *   artifacts, writes a sync tombstone and fires a webhook. And deleting a path that is not there SUCCEEDS —
 *   the opposite of every brain delete, all four of which error on an unknown id. A caller who reads a
 *   success as proof the file existed is wrong, and nothing said so.
 * - **`move_file` tombstones the old paths**, because sync has no rename detection: without it the peer's
 *   manifest pushes the original back and you have both copies. For a directory move that is every child
 *   path, and every child's metadata is re-rooted too — this tool used to rename only the record it was
 *   handed, orphaning the rest.
 * - **`create_dir` is mostly unnecessary.** `write_file` and `move_file` create their destination's parents
 *   themselves, so the tool is for the case where the EMPTY directory is the point — and an empty directory
 *   never reaches a peer, because only files sync.
 *
 * ## Every claim is checked against source
 *
 * Prose about a cascade is worth nothing if the cascade changes underneath it. Each assertion below names the
 * function that makes its sentence true, so removing the behaviour fails the description rather than quietly
 * outdating it.
 *
 * Run: node --test testing/standalone/file-mutation-tools-state-their-cascade.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blockAfter } from './_structural-window.mjs';
import { stripComments } from './_strip-comments.mjs';

const FILE_TOOLS = readFileSync('server/src/mcp/tools/file.ts', 'utf8');
const CASCADE = stripComments(readFileSync('server/src/files/delete-cascade.ts', 'utf8'));
const FILES = stripComments(readFileSync('server/src/files/files.ts', 'utf8'));
const FS_MODES = stripComments(readFileSync('server/src/util/fs-modes.ts', 'utf8'));

const description = (name) => {
  const s = stripComments(FILE_TOOLS);
  const at = s.indexOf(`name: '${name}'`);
  assert.ok(at > 0, `${name} not found — the scanner is wrong, not the code`);
  const d = s.indexOf('description:', at);
  const end = s.slice(d).search(/\n {2,}(mutating|spaceRequired|admin|spaceAdmin|inputSchema|async handle):/);
  assert.ok(end > 0, `could not find the end of ${name}'s description`);
  return s.slice(d, d + end);
};

const DELETE = description('delete_file');
const MOVE = description('move_file');
const MKDIR = description('create_dir');

describe('delete_file describes the cascade it really performs', () => {
  it('names the derived things that go with the blob', () => {
    for (const claim of [/tombstone/i, /job/i, /artifact/i, /webhook/i, /usage/i]) {
      assert.match(DELETE, claim, 'a caller deleting by other means needs to know what this cleans up');
    }
  });

  it('and each of those is really in the cascade', () => {
    // Pinned to the implementation: prose about a cascade is worthless if the cascade changed underneath it.
    for (const fn of ['writeFileTombstones', 'cancelMediaJob', 'deleteConversionArtifacts',
      'invalidateUsageCache', 'emitWebhookEvent']) {
      assert.match(CASCADE, new RegExp(`${fn}\\(`), `${fn} left the cascade — the description now overclaims`);
    }
  });

  it('says it is IDEMPOTENT, and contrasts it with the brain deletes', () => {
    // The asymmetry that makes a success misleading: this returns fine for a path that was never there,
    // while delete_memory/edge/entity/chrono all throw on an unknown id.
    assert.match(DELETE, /IDEMPOTENT/, 'a caller must not read success as proof the file existed');
    assert.match(DELETE, /delete_memory|brain deletes/i, 'name what behaves differently');
  });

  it('and that is still true — the handler returns success unconditionally', () => {
    const handler = FILE_TOOLS.slice(FILE_TOOLS.indexOf("name: 'delete_file'"));
    const end = handler.indexOf('\nexport const ');
    const body = stripComments(end === -1 ? handler : handler.slice(0, end));
    assert.match(body, /await deleteFileCascade\([^)]*\);\s*return \{/,
      'a not-found check appeared — delete_file is no longer idempotent and the description must change');
  });
});

describe('move_file explains the tombstone and the directory case', () => {
  it('says the OLD paths are tombstoned, and why', () => {
    assert.match(MOVE, /TOMBSTONED/, 'name it');
    assert.match(MOVE, /rename detection/i,
      'the reason is the interesting part: sync cannot tell a move from a delete-plus-create');
  });

  it('says a directory move carries every child\'s metadata', () => {
    // The defect that was fixed and would otherwise be invisible: child records orphaned at paths with no
    // files.
    assert.match(MOVE, /DIRECTORY MOVE CARRIES EVERY CHILD/,
      'a caller moving a tree needs to know its tags survive');
  });

  it('warns that nothing checks the destination', () => {
    assert.match(MOVE, /NOTHING CHECKS THE DESTINATION FIRST/,
      'a move onto an existing path is a filesystem rename, and there is no refusal to catch it');
  });

  it('and that really is the case — moveFile renames with no existence check', () => {
    const at = FILES.indexOf('export async function moveFile');
    const body = FILES.slice(at, FILES.indexOf('\nexport ', at + 10));
    assert.match(body, /fs\.rename\(srcAbs, dstAbs\)/, 'it is a bare rename');
    assert.doesNotMatch(body, /fileExists|already exists/,
      'a destination check appeared — delete the warning rather than leaving it wrong');
  });

  it('says the content is not re-read, so a failed extraction stays failed', () => {
    assert.match(MOVE, /NOT RE-READ/, 'moving is not a repair, and retry_embedding is the tool that is');
  });
});

describe('create_dir says when you do not need it', () => {
  it('points out that write_file and move_file make their own parents', () => {
    assert.match(MKDIR, /write_file/, 'most callers should skip this step entirely');
  });

  it('and they really do', () => {
    for (const fn of ['writeFile', 'moveFile']) {
      const at = FILES.indexOf(`export async function ${fn}`);
      const body = FILES.slice(at, FILES.indexOf('\nexport ', at + 10));
      assert.match(body, /mkdirPrivate\(path\.dirname\(/, `${fn} no longer creates its parents`);
    }
  });

  it('says creating an existing directory succeeds', () => {
    assert.match(MKDIR, /SUCCEEDS rather than erroring/, 'safe to call blind is worth stating');
    assert.match(FS_MODES, /mkdir\(dir, \{ recursive: true/, 'which is only true while mkdir is recursive');
  });

  it('says an empty directory never reaches a peer', () => {
    assert.match(MKDIR, /NOT A SYNCED OBJECT/, 'only files sync');
  });

  it('and the sync-facing walk really pushes files only', () => {
    // `listFilesRecursive` descends into directories but pushes only `isFile()` entries, which is what makes
    // "an empty directory does not sync" true rather than plausible.
    const at = FILES.indexOf('export async function listFilesRecursive');
    const body = FILES.slice(at, FILES.indexOf('\nexport ', at + 10));
    // TWO WINDOWS, converted: each subject is a BRANCH of the same if/else, bounded by its own brace. The caps
    // could not tell "the push is in the isFile arm" from "the push is 80 characters later" — and if it moved
    // into the isDirectory arm the walk would emit directories, which is the exact claim above.
    const dir = body.indexOf('entry.isDirectory()');
    const file = body.indexOf('entry.isFile()');
    assert.ok(dir > -1 && file > -1, 'the walk no longer branches on entry type — re-anchor this gate');
    assert.match(blockAfter(body, dir, 'the isDirectory arm'), /walk\(full\)/, 'it descends');
    assert.match(blockAfter(body, file, 'the isFile arm'), /out\.push/, 'but only files are emitted');
  });
});
