/**
 * Unreachable code must stay a compile ERROR, in every tsconfig that compiles product code.
 *
 * ## The defect that put this here
 *
 * `moveSpaceData` ended with:
 *
 *     return errors;
 *     // Usage history follows the space. ...
 *     try { const { renameSpaceActivity } = await import(...); ... }
 *
 * So renaming a space never moved its usage buckets: the renamed space showed a blank Usage panel and the old
 * rows lingered under an id that no longer existed — the exact failure the comment above the dead block says it
 * prevents. It survived review, the test suite and a clean `tsc`, because TypeScript's default for
 * `allowUnreachableCode` is "grey it out in the editor" and nothing else. The gate that would have caught it is
 * a compiler flag, and it costs nothing.
 *
 * ## Why a test about a config file
 *
 * The protection is one line, in two files, and deleting either is silent — the build stays green and the
 * codebase quietly goes back to accepting statements that cannot run. `client/tsconfig.json` deliberately does
 * NOT extend `tsconfig.base.json`, so the flag genuinely has to be in both places; a single source of truth is
 * not available to assert instead.
 *
 * Reading NAMED files, not an enumeration: if one moves, this throws.
 *
 * Run: node --test testing/standalone/unreachable-code-is-an-error.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Every tsconfig that compiles product code, and what each one covers. */
const CONFIGS = [
  ['tsconfig.base.json', 'the server (server/tsconfig.json extends it)'],
  ['client/tsconfig.json', 'the client app and its specs (both extend it)'],
];

/** JSON with comments — the repo uses them for exactly the rationale this asserts. */
const parseJsonc = (text) => JSON.parse(
  text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''),
);

describe('unreachable code is a compile error', () => {
  for (const [file, covers] of CONFIGS) {
    it(`${file} sets allowUnreachableCode: false — ${covers}`, () => {
      const cfg = parseJsonc(readFileSync(join(ROOT, file), 'utf8'));
      assert.equal(
        cfg.compilerOptions?.allowUnreachableCode, false,
        `${file} no longer errors on unreachable code, so a statement after a return compiles silently again `
        + '(that is how renameSpaceActivity ended up dead in moveSpaceData)',
      );
    });

    it(`${file} sets allowUnusedLabels: false`, () => {
      // Same class, same one-line cure: a stray label is either a typo or dead structure.
      const cfg = parseJsonc(readFileSync(join(ROOT, file), 'utf8'));
      assert.equal(cfg.compilerOptions?.allowUnusedLabels, false, `${file} allows unused labels`);
    });
  }

  it('the server tsconfig still inherits from the base', () => {
    // If it stops extending, the flag above stops applying to the server and this file's first case would
    // keep passing while proving nothing about the code it is meant to protect.
    const server = parseJsonc(readFileSync(join(ROOT, 'server/tsconfig.json'), 'utf8'));
    assert.match(String(server.extends), /tsconfig\.base\.json$/);
    assert.equal(server.compilerOptions?.allowUnreachableCode, undefined,
      'the server config now sets this itself — either fine, or a sign the inheritance broke; check both');
  });

  it('the client app and spec configs still inherit from client/tsconfig.json', () => {
    for (const f of ['client/tsconfig.app.json', 'client/tsconfig.spec.json']) {
      const cfg = parseJsonc(readFileSync(join(ROOT, f), 'utf8'));
      assert.match(String(cfg.extends), /tsconfig\.json$/, `${f} no longer extends the client base config`);
    }
  });

  it('the comment-stripping parser is not the thing being tested', () => {
    // A parser that quietly returned `{}` would make every assertion above vacuous.
    const parsed = parseJsonc('{\n  // a line comment\n  "compilerOptions": { "allowUnreachableCode": false }\n}');
    assert.equal(parsed.compilerOptions.allowUnreachableCode, false);
    assert.throws(() => parseJsonc('{ not json'));
  });
});
