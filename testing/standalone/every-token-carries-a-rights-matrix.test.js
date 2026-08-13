/**
 * Every token carries a rights matrix — at mint, not only after a restart.
 *
 * ## The hole this closes, measured
 *
 * `enforceAreaRung` returns `true` when a record has no `rights`, so the per-space rung is not checked at all for
 * such a token. The load-time backfill derived a matrix for every token in the config — but only for the tokens
 * that were already there. A token minted afterwards had none until the next boot.
 *
 * Probed against a running instance on 2026-08-13:
 *
 * | token | `DELETE /api/brain/spaces/general/memories/:id` |
 * |---|---|
 * | minted with an explicit `rights` matrix (`knowledge: write`) | **403** `Token needs 'admin' on knowledge…` |
 * | minted with no rights at all | **204** — the rung was never consulted |
 *
 * Owner ruling, 2026-08-13: *"translate old tokens into matrix rights and overwrite on update. only matrix from
 * now on."*
 *
 * ## What this gate holds, and why by source
 *
 * The behaviour needs a running server and a config write, which the integration suite covers. What this gate
 * pins is cheaper and catches the regression that actually happened: the code paths that can produce a token
 * must all produce a matrix, and nothing may edit the legacy fields afterwards.
 *
 * Run: node --test testing/standalone/every-token-carries-a-rights-matrix.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';

const read = p => stripComments(readFileSync(p, 'utf8'));
const TOKENS = 'server/src/auth/tokens.ts';
// The boot step moved out of the loader when persisting it pushed that file past its god-file freeze.
const BOOT = 'server/src/auth/backfill-token-rights.ts';

describe('a minted token has a matrix', () => {
  const src = read(TOKENS);

  it('createToken derives one when the caller did not supply it', () => {
    // NOT `...(opts.rights ? {rights} : {})` — that spread is what left a new token matrix-less until the next
    // boot, and the rung silently unenforced in the meantime.
    assert.match(src, /rights: opts\.rights \?\? \(migrateToken\(\{/,
      'createToken must fall back to a derived matrix rather than omitting the field');
    assert.ok(!/\.\.\.\(opts\.rights \? \{ rights: opts\.rights \} : \{\}\)/.test(src),
      'the conditional spread is back — a token minted without explicit rights would carry no matrix');
  });

  it('the derivation is the shared one, not a second opinion', () => {
    // `migrateToken` is the single translation from legacy fields. A local re-implementation would be the
    // two-implementations-of-one-rule defect this repo produces most.
    assert.match(src, /import \{ migrateToken \} from '\.\/rights-migration\.js'/);
  });
});

describe('the boot migration is durable', () => {
  const src = read(BOOT);

  it('the backfill result is written to disk, not just held in memory', () => {
    const at = src.indexOf('export function migrateTokenRightsOnBoot');
    assert.ok(at > -1, 'the boot step is gone — re-anchor this gate');
    const after = src.slice(at, at + 700);
    assert.match(after, /if \(filled === 0\) return 0;/, 'a write only when something changed');
    assert.match(after, /persist\(config\)/, 'and it must actually persist');
    // And the loader must still CALL it, or the migration is code nobody runs.
    assert.match(read('server/src/config/loader.ts'), /migrateTokenRightsOnBoot\(_config\)/);
  });

  it('a failed write retries next boot rather than being reported as done', () => {
    const at = src.indexOf('export function migrateTokenRightsOnBoot');
    const after = src.slice(at, at + 900);
    assert.match(after, /catch/, 'a failed persist must not throw at boot');
    assert.match(after, /will retry next boot/i, 'and must say so, like the media-embedding migration beside it');
  });
});

describe('nothing edits the legacy fields after mint', () => {
  it('the legacy-allowlist writer is gone, not merely unused', () => {
    // `updateTokenSpaces` had zero callers and its whole job was editing `spaces` — the field the matrix
    // replaces. Kept around, it is the obvious thing for a future caller to reach for, and it would put the two
    // descriptions of access back out of step.
    // `git grep` exits 1 with no output when nothing matches, and does not see this file until it is tracked —
    // so both "no hits" and "only this file" are the healthy answers, and anything else is a real reference.
    let hits = '';
    try {
      hits = execFileSync('git', ['grep', '-l', 'updateTokenSpaces', '--', 'server/src', 'client/src', 'testing'],
        { encoding: 'utf8', cwd: process.cwd() }).trim();
    } catch { /* exit 1 = no matches */ }
    const others = hits.split('\n').map(l => l.trim().replace(/\\/g, '/')).filter(Boolean)
      .filter(f => !f.endsWith('every-token-carries-a-rights-matrix.test.js'));
    assert.deepEqual(others, [], `updateTokenSpaces is referenced again by: ${others.join(', ')}`);
  });

  it('rights are replaced wholesale, never merged', () => {
    // A merge would let a caller widen one area while believing they had described the whole token.
    const src = read(TOKENS);
    assert.match(src, /config\.tokens\[idx\]!\.rights = rights;/,
      'setTokenRights must assign, not merge');
  });
});
