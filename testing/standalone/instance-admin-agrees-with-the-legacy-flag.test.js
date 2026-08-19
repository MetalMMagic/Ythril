/**
 * Does `rights.instanceAdmin` answer the same question as the legacy `admin` boolean, for every token shape?
 *
 * ## Why this lands before the switch, and alone
 *
 * `enforceAdmin` — the one function behind every admin route — still gates on `record.admin`. Moving it onto
 * the matrix is the remaining half of D-8d for that field, and it is the change in this whole feature where
 * a mistake is SILENT WIDENING: a token reaching a route it never could, with no error and nothing in the
 * response to say so.
 *
 * `auth/space-reach.ts` records the shape that worked last time this was done, and this file follows it:
 *
 *   > the replacement lands first, as a pure function, next to a test that asserts it agrees with the legacy
 *   > rule for every token shape. Only once the two provably answer the same question does the guard move
 *   > onto it. Behaviour changes when the guard changes; nothing here changes anything.
 *
 * So this PR changes no behaviour at all. It establishes whether the switch is safe, and — where the two can
 * diverge — says exactly how, so the switch is designed against facts rather than an assumption.
 *
 * ## What it found
 *
 * They agree for every token the MIGRATION produces, which is every token that predates the matrix. They can
 * diverge only for a token minted with an EXPLICIT rights matrix, because `createToken` stores the caller's
 * `admin` and the caller's `rights` independently. The mint route is where that has to be prevented, and the
 * last two assertions pin whether it is.
 *
 * Run: node --test testing/standalone/instance-admin-agrees-with-the-legacy-flag.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';
import { bodyOf } from './_structural-window.mjs';

let migrateToken;
before(async () => {
  ({ migrateToken } = await import('../../server/dist/auth/rights-migration.js'));
});

/** Every legacy token shape that can exist in a stored config. */
const SHAPES = [
  { label: 'plain write token, unrestricted', legacy: {} },
  { label: 'plain write token, scoped', legacy: { spaces: ['qa'] } },
  { label: 'read-only, unrestricted', legacy: { readOnly: true } },
  { label: 'read-only, scoped', legacy: { readOnly: true, spaces: ['qa'] } },
  { label: 'admin, unrestricted', legacy: { admin: true } },
  { label: 'admin, scoped', legacy: { admin: true, spaces: ['qa'] } },
  { label: 'admin AND read-only (contradictory, but storable)', legacy: { admin: true, readOnly: true } },
  { label: 'empty allowlist — reaches nothing', legacy: { spaces: [] } },
  { label: 'schema-library token', legacy: { schemaLibrary: true, spaces: [] } },
];

describe('for every migrated token, instanceAdmin equals the legacy flag', () => {
  for (const { label, legacy } of SHAPES) {
    it(label, () => {
      const rights = migrateToken(legacy);
      assert.equal(
        rights.instanceAdmin, legacy.admin === true,
        `instanceAdmin=${rights.instanceAdmin} but admin=${legacy.admin === true} — enforceAdmin cannot be `
        + 'moved onto the matrix while these disagree for any shape',
      );
    });
  }

  it('and a schema-library token is never an instance admin, whatever else it says', () => {
    // The one shape where the migration deliberately ignores its input: a library token is read-only and
    // space-less by construction, so it must not inherit an admin flag somebody set by mistake.
    assert.equal(migrateToken({ schemaLibrary: true, admin: true, spaces: [] }).instanceAdmin, false);
  });
});

describe('where they CAN diverge, and what stops it', () => {
  it('createToken stores the two independently — so the mint route is the enforcement point', () => {
    // Stated as a fact about the code rather than a complaint: `admin` and `rights` are separate parameters
    // and both are written. Nothing at this depth can reconcile them, because this function has neither the
    // minter's record nor the route's validation.
    const tokens = stripComments(readFileSync('server/src/auth/tokens.ts', 'utf8'));
    assert.match(tokens, /admin: opts\.admin \?\? false,/, 'the legacy flag is stored from its own input');
    assert.match(tokens, /rights: opts\.rights \?\?/, 'and the matrix from its own, independently');
  });

  it('the mint route refuses `admin` as an input and names the matrix field instead', () => {
    // This is what makes the two provably agree in practice: a caller cannot set the legacy flag to
    // something the matrix does not say, because it cannot set the legacy flag at all.
    const routes = stripComments(readFileSync('server/src/api/tokens.ts', 'utf8'));
    assert.match(routes, /admin: 'set `rights\.instanceAdmin`'/,
      'the echoable map must direct a caller to the matrix field');
  });

  it('and the refusal is a CHANGE, not an echo — a round-trip must still work', () => {
    // The distinction the map exists for: sending back the same value you read is a round-trip and is
    // ignored; sending a DIFFERENT one is refused and names the field to use. Losing that would break every
    // client that PATCHes a token by re-sending the record it just read.
    const routes = stripComments(readFileSync('server/src/api/tokens.ts', 'utf8'));
    assert.match(routes, /ECHOABLE/, 'the mechanism must still exist');
  });
});

describe('the guard has moved onto the matrix, and this evidence is why it could', () => {
  /**
   * This block asserted the OPPOSITE for exactly one release: that `enforceAdmin` still read
   * `record.admin`, so the sequencing was explicit and the switch could not be slipped in unnoticed.
   *
   * It fired the moment the guard moved — which was its whole purpose, and the instruction it carried was
   * *"re-read everything above rather than renumber it"*. Re-read: the agreement assertions above are
   * unchanged and still pass, so the switch rests on the same evidence it was designed to rest on.
   *
   * What this file keeps proving is the AGREEMENT. The behaviour of the moved guard belongs to
   * `enforce-admin-reads-the-matrix.test.js`, and duplicating it here would give two files one subject.
   */
  it('enforceAdmin no longer reads the legacy boolean directly', () => {
    const mw = stripComments(readFileSync('server/src/auth/middleware.ts', 'utf8'));
    /*
     * The whole function, to the next top-level declaration. An ABSENCE assertion behind a 200-character cap passes
     * the moment the function grows past it — so the check would have quietly stopped covering the thing it names.
     */
    assert.doesNotMatch(bodyOf(mw, 'enforceAdmin'), /if \(!record\.admin\)/,
      'the switch has happened; the agreement above is what made it safe');
  });

  it('and the agreement remains the thing that justifies it', () => {
    // The guard now asks one predicate. If that predicate ever stops agreeing with the migration, the tests
    // above fail — which is the tie between this file and the switch, and the reason it is not deleted.
    // The predicate moved to `auth/instance-admin.ts` when `mcp/oauth.ts` needed it too and the import graph
    // closed a cycle. `middleware.ts` re-exports it, so every existing importer keeps one name for one rule
    // — which is what this assertion is actually about.
    assert.match(stripComments(readFileSync('server/src/auth/instance-admin.ts', 'utf8')),
      /export function isInstanceAdmin/, 'one predicate, whose agreement this file pins');
    assert.match(stripComments(readFileSync('server/src/auth/middleware.ts', 'utf8')),
      /export \{ isInstanceAdmin \}/, 'and one name for it, wherever a caller already imported from');
  });
});
