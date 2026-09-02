/**
 * A renamed env var may appear in the docs, but never on its own.
 *
 * ## The failure
 *
 * `VISION_BASE_URL`, `STT_BASE_URL` and `STT_MODEL` replaced `OLLAMA_URL`, `WHISPER_URL` and
 * `WHISPER_MODEL` in 2.1, because the old names described the implementation that happened to be first
 * rather than the field they configure. The old names keep working **and warn once at startup** — a
 * deliberate choice: breaking a documented env var to improve its spelling is not a trade worth making,
 * but an alias nobody is told about is one nobody migrates off.
 *
 * The documentation then went on recommending the old ones. `05b-media-embedding.md` opened its "required
 * services" list with all three, so an operator following the setup instructions earned a deprecation
 * warning for doing exactly what the document said — while the same file, eighty lines down, carried the
 * rename note. And `02-hosting.md`'s egress matrix named `OLLAMA_URL` for the vision slot on the row above
 * `STT_BASE_URL` for speech-to-text: two spellings of the same decision, one table apart.
 *
 * ## Why no existing gate saw it
 *
 * `egress-matrix` asserts *every documented env var is real*, and `OLLAMA_URL` is entirely real — the
 * loader reads it, on purpose. `env-var-docs-coverage` asserts the docs name every variable the code
 * reads, and the code does read it. Both are right. Neither asks which of two working names a reader
 * should be told to use, and that is a claim about behaviour, which is the class of documentation defect
 * a name-existence check cannot reach.
 *
 * ## The rule
 *
 * A legacy name may appear only on a line that also names its replacement. That covers every legitimate
 * use — the rename note, the "Legacy alias: X" column, the upgrade table — and nothing else, so there is
 * no exemption list to grow. It is also the shape a reader needs: seeing the old name without the new one
 * beside it is precisely what leaves them on the deprecated spelling.
 *
 * ## The pairs come from the code
 *
 * `RENAMED_ENV_VARS` in the config loader is the ground truth, parsed rather than copied. A hand-kept
 * second list would be one more thing to remember on the next rename — and the next rename is exactly
 * when this check needs to already be right.
 *
 * Run: node --test testing/standalone/docs-name-current-env-vars.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

/*
 * The ground truth MOVED, and the rule it feeds got stronger rather than weaker.
 *
 * These three were ALIASES for the whole of 3.x, resolved by `RENAMED_ENV_VARS` in the config loader — which
 * is what this gate used to parse. 4.0 removed them: the names now live in `env-removed.ts` and REFUSE the
 * boot instead of resolving.
 *
 * So a doc line naming one of them without its replacement was misleading before and is actively wrong now:
 * an operator following it writes a manifest that will not start. Same assertion, higher stakes, one file
 * further along.
 */
const REMOVED = 'server/src/config/env-removed.ts';

/** The `{ current, legacy }` pairs, read out of the removal table rather than copied into this file. */
function renamedPairs() {
  const src = readFileSync(REMOVED, 'utf8');
  const table = src.slice(src.indexOf('const REMOVED_ENV_VARS'));
  const body = table.slice(0, table.indexOf('];'));
  return [...body.matchAll(/removed:\s*'([A-Z0-9_]+)',\s*use:\s*'([A-Z0-9_]+)'/g)]
    .map((m) => ({ current: m[2], legacy: m[1] }));
}

function docLines() {
  const files = execFileSync('git', ['ls-files', 'docs/*.md', 'docs/*/*.md'], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  return files.flatMap((f) => readFileSync(f, 'utf8').split(/\r?\n/).map((text, i) => ({ file: f, line: i + 1, text })));
}

describe('the check itself works before it is trusted', () => {
  it('reads the removal table out of its module', () => {
    // If the table is renamed or restructured this finds nothing, and a gate that checks nothing passes.
    const pairs = renamedPairs();
    assert.ok(pairs.length >= 3, `parsed ${pairs.length} removed env vars out of ${REMOVED} — expected at least 3`);
    assert.ok(pairs.some((p) => p.legacy === 'OLLAMA_URL' && p.current === 'VISION_BASE_URL'),
      'the OLLAMA_URL -> VISION_BASE_URL pair is missing; the parse is wrong or the rename was undone');
  });

  it('sees the docs', () => {
    const lines = docLines();
    assert.ok(lines.length > 2000, `only read ${lines.length} lines of documentation`);
  });

  it('FLAGS a legacy name that stands alone, and allows one paired with its replacement', () => {
    // Mutation-check on the predicate. A rule that cannot fire looks exactly like a clean repository.
    const pairs = [{ current: 'NEW_NAME', legacy: 'OLD_NAME' }];
    const check = (text) => offenders([{ file: 'x.md', line: 1, text }], pairs);
    assert.equal(check('set `OLD_NAME` to the endpoint').length, 1, 'a lone legacy name must be flagged');
    assert.equal(check('`OLD_NAME` is now `NEW_NAME`').length, 0, 'a paired mention must be allowed');
  });
});

/** Doc lines naming a legacy env var without its replacement. Exported shape kept simple for the test above. */
function offenders(lines, pairs) {
  const out = [];
  for (const { file, line, text } of lines) {
    for (const { current, legacy } of pairs) {
      if (text.includes(legacy) && !text.includes(current)) out.push(`${file}:${line} names ${legacy} without ${current}`);
    }
  }
  return out;
}

describe('the docs recommend the current env var names', () => {
  it('never names a renamed variable without its replacement on the same line', () => {
    const found = offenders(docLines(), renamedPairs());
    assert.deepEqual(found, [],
      'These lines send a reader to a deprecated env var:\n  ' + `${found.join('\n  ')}\n\n`
      + 'The old names were REMOVED in 4.0 and refuse the boot, so a reader following this line writes a\n'
      + 'manifest that will not start. Use the current name; if the line is genuinely about the removal,\n'
      + 'name both on it.');
  });
});
