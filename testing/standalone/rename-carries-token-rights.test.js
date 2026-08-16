/**
 * Renaming a space carries every token's scope with it — the rights MATRIX, not only the legacy allowlist.
 *
 * ## The defect
 *
 * `applySpaceRenameToConfig` re-keyed `tok.spaces` and nothing anywhere touched `rights.perSpace`. So a
 * rename silently stripped every matrix-scoped token's access to the space: the row stayed under the OLD id,
 * which now names nothing.
 *
 * That is **every token minted since 2.9**. The rights editor writes `perSpace`; nothing writes the
 * allowlist — the mint route's own refusal map tells a caller to use `rights.perSpace` instead. So the half
 * that was maintained was the half nobody has.
 *
 * It fails silently at both ends: no error when renaming, and later a 403 that reads as though the rights
 * were never granted. Found while measuring the `spaces` field deletion — and worth fixing first, because
 * deleting the field without this would have removed the only rename handling that existed.
 *
 * ## Exercised, not grepped
 *
 * `applySpaceRenameToConfig` is exported and operates on a plain config object, so these are real calls with
 * real verdicts. A source-reading test could not tell a re-key that runs from one that is unreachable.
 *
 * Run: node --test testing/standalone/rename-carries-token-rights.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let applySpaceRenameToConfig;
before(async () => {
  ({ applySpaceRenameToConfig } = await import('../../server/dist/spaces/rename.js'));
});

const ALL = (r) => ({ knowledge: r, files: r, schema: r, dataQuality: r });

/** A config holding one space and whatever tokens a test needs. */
const cfgWith = (tokens) => ({
  instanceId: 'i', instanceLabel: 'I',
  spaces: [{ id: 'old', label: 'Old' }],
  networks: [],
  tokens,
});

const space = (cfg) => cfg.spaces.find(s => s.id === 'old') ?? cfg.spaces[0];

describe('the matrix row follows the rename', () => {
  it('perSpace is re-keyed from the old id to the new one', () => {
    const cfg = cfgWith([{ id: 't1', rights: { instanceAdmin: false, createSpaces: false, floor: null, perSpace: { old: ALL('write') } } }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');

    const perSpace = cfg.tokens[0].rights.perSpace;
    assert.deepEqual(perSpace['new'], ALL('write'), 'the row must move to the new id');
    assert.equal(perSpace['old'], undefined, 'and must not be left behind under a name that no longer exists');
  });

  it('the rung is carried unchanged — a rename is not a re-grant', () => {
    const cfg = cfgWith([{ id: 't1', rights: { instanceAdmin: false, createSpaces: false, floor: null, perSpace: { old: { knowledge: 'admin', files: 'read', schema: 'none', dataQuality: 'write' } } } }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    assert.deepEqual(cfg.tokens[0].rights.perSpace['new'],
      { knowledge: 'admin', files: 'read', schema: 'none', dataQuality: 'write' });
  });

  it('a token with a row for a DIFFERENT space is untouched', () => {
    const cfg = cfgWith([{ id: 't1', rights: { instanceAdmin: false, createSpaces: false, floor: null, perSpace: { other: ALL('read') } } }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    assert.deepEqual(Object.keys(cfg.tokens[0].rights.perSpace), ['other']);
  });

  it('a token with no matrix at all does not throw', () => {
    // Pre-matrix records exist until the field goes; the re-key must skip them rather than crash a rename.
    const cfg = cfgWith([{ id: 't1', spaces: ['old'] }, { id: 't2' }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    assert.deepEqual(cfg.tokens[0].spaces, ['new'], 'the legacy allowlist still moves');
  });

  it('every token is carried, not just the first', () => {
    // A loop that returned early would pass a single-token fixture and strip everyone else.
    const mk = () => ({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: { old: ALL('write') } });
    const cfg = cfgWith([{ id: 'a', rights: mk() }, { id: 'b', rights: mk() }, { id: 'c', rights: mk() }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    for (const t of cfg.tokens) {
      assert.deepEqual(t.rights.perSpace['new'], ALL('write'), `${t.id} lost its scope`);
      assert.equal(t.rights.perSpace['old'], undefined, `${t.id} kept a dead key`);
    }
  });
});

describe('it refuses to overwrite an existing row', () => {
  it('a token already holding rights at the NEW id keeps them', () => {
    // `perSpace` is keyed by id, so re-keying is a move within an object rather than an index swap: a row
    // already at `newId` would be silently replaced by one that used to be somewhere else, widening or
    // narrowing that token with nothing to show for it.
    //
    // The rename route refuses a `newId` that already exists, so this is unreachable through the API — but
    // this function is also reached on resume after a crash, and an unreviewable clobber is not worth the
    // two lines it saves.
    const cfg = cfgWith([{
      id: 't1',
      rights: { instanceAdmin: false, createSpaces: false, floor: null, perSpace: { old: ALL('read'), new: ALL('admin') } },
    }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    assert.deepEqual(cfg.tokens[0].rights.perSpace['new'], ALL('admin'),
      'the existing row wins — a rename must not silently re-grant');
  });
});

describe('the legacy half still works while the field exists', () => {
  it('the allowlist is re-keyed too', () => {
    const cfg = cfgWith([{ id: 't1', spaces: ['other', 'old'] }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    assert.deepEqual(cfg.tokens[0].spaces, ['other', 'new'], 'position preserved, id updated');
  });

  it('and a token holding BOTH shapes has both carried', () => {
    // The state a pre-matrix token is in after the boot backfill: allowlist and matrix, both naming the
    // space. Missing either leaves it half-scoped.
    const cfg = cfgWith([{
      id: 't1',
      spaces: ['old'],
      rights: { instanceAdmin: false, createSpaces: false, floor: null, perSpace: { old: ALL('write') } },
    }]);
    applySpaceRenameToConfig(cfg, space(cfg), 'old', 'new');
    assert.deepEqual(cfg.tokens[0].spaces, ['new']);
    assert.deepEqual(cfg.tokens[0].rights.perSpace['new'], ALL('write'));
  });
});
