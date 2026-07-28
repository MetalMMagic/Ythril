/**
 * `If-Match` preconditions on space-meta writes.
 *
 * `space.meta.version` was incremented on every write and every previous version kept in
 * `previousVersions` — but nothing ever compared it. Two admins editing one space was last-write-wins
 * on the whole meta object: the second save silently discarded the first, and the only trace was a
 * history entry nobody reads. The counter RECORDED collisions; it never prevented one.
 *
 * These tests pin the decision function and, structurally, that both meta-writing routes consult it
 * before doing anything. The second half matters as much as the first: a precondition evaluated after
 * a side effect is not a precondition. `PUT /:id/schema` writes a timestamped backup file, so a check
 * placed below it would reject the write and still litter the space with a backup of a change that
 * never happened.
 *
 * Run: node --test testing/standalone/meta-precondition.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let checkMetaPrecondition, preconditionErrorBody;

before(async () => {
  ({ checkMetaPrecondition, preconditionErrorBody } =
    await import('../../server/dist/spaces/meta-precondition.js'));
});

describe('If-Match — absent means no precondition', () => {
  it('allows a write when no header was sent', () => {
    // Opt-in by absence. Making the header mandatory would break every existing client and script to
    // protect against a race most never hit; a client that wants the guarantee asks for it.
    assert.deepEqual(checkMetaPrecondition(undefined, 7), { ok: true });
  });

  it('allows a write for `*` on any version', () => {
    // RFC 9110: `*` matches any current representation. It asserts the space EXISTS, which the route
    // has already established by this point.
    assert.deepEqual(checkMetaPrecondition('*', 0), { ok: true });
    assert.deepEqual(checkMetaPrecondition('*', 99), { ok: true });
  });
});

describe('If-Match — version comparison', () => {
  it('allows the write when the version matches', () => {
    assert.deepEqual(checkMetaPrecondition('4', 4), { ok: true });
  });

  it('accepts all three spellings of the same version', () => {
    // Bare, quoted entity-tag, and weak. A client library that quotes automatically must not have
    // every write rejected, and one that does not quote must not either.
    for (const spelling of ['4', '"4"', 'W/"4"', ' 4 ']) {
      assert.deepEqual(checkMetaPrecondition(spelling, 4), { ok: true }, `spelling: ${spelling}`);
    }
  });

  it('REJECTS with 412 when the space moved on', () => {
    // The whole point: this is the edit that used to be silently discarded.
    const v = checkMetaPrecondition('3', 5);
    assert.equal(v.ok, false);
    assert.equal(v.status, 412, 'a failed If-Match is 412 Precondition Failed, not 409');
    assert.equal(v.reason, 'mismatch');
    assert.deepEqual([v.expected, v.actual], [3, 5]);
  });

  it('rejects a STALE-in-either-direction version, not just an older one', () => {
    // A client that somehow reports a future version is equally out of sync; matching is equality,
    // not "at least".
    assert.equal(checkMetaPrecondition('9', 5).ok, false);
    assert.equal(checkMetaPrecondition('1', 5).ok, false);
  });

  it('treats a space that has never had meta as version 0', () => {
    // `If-Match: 0` is how a caller says "only if nobody has configured this yet".
    assert.deepEqual(checkMetaPrecondition('0', 0), { ok: true });
    assert.equal(checkMetaPrecondition('0', 1).ok, false);
  });
});

describe('If-Match — malformed values are refused, never ignored', () => {
  it('rejects a non-numeric value with 400', () => {
    // Ignoring an unparseable precondition would hand back exactly the false safety the header was
    // asked for — the client believes it is protected and is not.
    for (const bad of ['abc', '"abc"', '', '   ', '4.5', '-1', 'null', 'undefined']) {
      const v = checkMetaPrecondition(bad, 4);
      assert.equal(v.ok, false, `should reject: ${JSON.stringify(bad)}`);
      assert.equal(v.status, 400, `should be 400: ${JSON.stringify(bad)}`);
    }
  });

  it('does not accept a numeric PREFIX as the version', () => {
    // The `parseInt` trap: it reads "4-and-a-half" as 4 and lets a nonsense precondition pass.
    const v = checkMetaPrecondition('4-and-a-half', 4);
    assert.equal(v.ok, false);
    assert.equal(v.status, 400);
  });
});

describe('If-Match — the error tells the caller what to do', () => {
  it('names both versions and the recovery step on a mismatch', () => {
    const body = preconditionErrorBody(checkMetaPrecondition('3', 5));
    assert.match(body.error, /re-read/i, 'should say how to recover, not just that it failed');
    assert.equal(body.expectedVersion, 3);
    assert.equal(body.currentVersion, 5);
  });

  it('shows the offending value on a malformed header', () => {
    const body = preconditionErrorBody(checkMetaPrecondition('bogus', 5));
    assert.match(body.error, /bogus/);
  });
});

describe('If-Match — both meta-writing routes check it, and check it FIRST', () => {
  const src = readFileSync(new URL('../../server/src/api/spaces.ts', import.meta.url), 'utf8');

  it('PATCH /:id consults the precondition', () => {
    assert.match(src, /checkMetaPrecondition\(req\.get\('If-Match'\)/);
  });

  it('both meta-writing routes consult it — not just the one that was easy', () => {
    const checks = src.match(/checkMetaPrecondition\(/g) ?? [];
    assert.ok(checks.length >= 2,
      `expected PATCH /:id and PUT /:id/schema to both check, found ${checks.length}`);
  });

  it('the schema route checks BEFORE writing its backup file', () => {
    // A precondition evaluated after a side effect is not a precondition. This route writes a
    // timestamped schema backup into the space; checking below it would reject the write and still
    // leave a backup of a change that never happened.
    const checkAt = src.indexOf("checkMetaPrecondition(req.get('If-Match'), space.meta?.version ?? 0)",
      src.indexOf("spacesRouter.put('/:id/schema'"));
    const backupAt = src.indexOf('backup of the previous schema', src.indexOf("spacesRouter.put('/:id/schema'"));
    assert.ok(checkAt > 0, 'the schema route should check the precondition');
    assert.ok(backupAt > 0, 'expected the schema-backup step to still exist');
    assert.ok(checkAt < backupAt, 'the precondition must be evaluated before the backup is written');
  });

  it('PATCH checks before taking the audit snapshot', () => {
    // The audit middleware records on any <400 response. A precondition checked after the snapshot
    // would still be correct, but this keeps the ordering explicit: rejected writes record nothing.
    const patchAt = src.indexOf("spacesRouter.patch('/:id'");
    const checkAt = src.indexOf('checkMetaPrecondition(', patchAt);
    const snapshotAt = src.indexOf('req.auditSnapshots', patchAt);
    assert.ok(checkAt > 0 && snapshotAt > 0);
    assert.ok(checkAt < snapshotAt, 'the precondition must be evaluated before the audit snapshot');
  });
});
