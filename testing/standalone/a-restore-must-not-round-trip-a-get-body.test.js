/**
 * A restore hook must not PATCH back a body it read from a GET.
 *
 * ## The defect, and why it read as a flake for two days
 *
 * `GET /api/admin/media-config` returns the RESOLVED `documentProcessing` block — seven keys more than the
 * patch schema declares: `maxTotalPages`, `vlmModel`, `vlmBaseUrl`, `repairModel`, `repairBaseUrl`,
 * `verifyModel`, `verifyBaseUrl`. That schema is `.strict()`, so PATCHing the block back is a **400 on the
 * whole body**. The restore never lands.
 *
 * Two `after` hooks did exactly that, and the failure is invisible whenever the value being restored happens
 * to equal the value already there. `vlm-extraction` writes `ocr` as its last act, so it failed only when the
 * instance had started on some other mode — which depends on what an earlier suite left. That is the whole of
 * its apparent intermittency: it was recorded on 2026-08-28 as "timing, not causal", and it is neither.
 *
 * The instrumentation added after the first occurrence is what closed it. The message went from
 * "verify still false after attempt 4" to `re-read: {"status":200,"mode":"ocr","wanted":"auto"}` — a 200 and
 * an unchanged value, which is a different fault from a PATCH that never arrived and the only thing that made
 * the cause findable.
 *
 * ## Why a gate rather than just the two fixes
 *
 * Because the shape is inviting: read the current state, keep it, put it back. It is the obvious way to write
 * a restore, and it is wrong for every `.strict()` schema whose GET resolves more than its PATCH accepts.
 * A third suite would be written the same way.
 *
 * Run: node --test testing/standalone/a-restore-must-not-round-trip-a-get-body.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';
import { argumentsOf } from './_structural-window.mjs';

/** Integration suites, from git — an untracked scratch file is not a suite. */
const SUITES = execFileSync('git', ['ls-files', 'testing/integration'], { encoding: 'utf8', maxBuffer: 1 << 24 })
  .split('\n').map(s => s.trim()).filter(f => f.endsWith('.test.js'));

describe('the sweep itself works', () => {
  it('found the integration suites', () => {
    assert.ok(SUITES.length >= 10, `expected the integration suites, found ${SUITES.length}`);
  });
});

describe('no restore PATCHes a block it read back from a GET', () => {
  it('every media-config restore filters to the patchable keys', () => {
    /*
     * The subject is derived: any `patch(... '/api/admin/media-config' ...)` whose body mentions a variable
     * holding a GET'd block. Rather than guess at variable names, the rule is simpler and stricter — a
     * media-config PATCH inside a restore must go through `patchableDocumentProcessing`, which is the one
     * place that knows what the schema accepts.
     */
    const offenders = [];
    for (const f of SUITES) {
      const src = stripComments(readFileSync(f, 'utf8'));
      /*
       * Anchored on the `patch(` CALL and read through its own argument list.
       *
       * The first draft anchored on `documentProcessing:` and asked whether the enclosing statement contained
       * `patch(` — but `statementAround` resolves that offset to the object literal, which does not. Mutating
       * the real pre-fix line survived, and that is the only reason the window was looked at again.
       */
      for (const m of src.matchAll(/\bpatch\(/g)) {
        // `argumentsOf` returns the arguments as an ARRAY, so `.includes` on it tests for an exact element —
        // and the path argument carries its quotes. Joined, which is what the two regexes below want anyway.
        const args = argumentsOf(src, m.index, `${f} patch call`).join(', ');
        if (!args.includes('/api/admin/media-config')) continue;
        const body = /documentProcessing:\s*(\w+)\b/.exec(args);
        // A literal object (`{ mode: 'ocr' }`) never round-trips; only a bare identifier can carry a GET body.
        if (!body || body[1] === 'patchableDocumentProcessing') continue;
        offenders.push(`${f}: documentProcessing: ${body[1]}`);
      }
    }
    assert.deepEqual(offenders, [],
      'these send a whole documentProcessing block to a .strict() patch schema that accepts fewer keys than '
      + 'the GET returns, so the write is a 400 and the restore silently never lands:\n  '
      + offenders.join('\n  '));
  });

  it('the filter names every key the patch schema accepts, and no more', () => {
    // Derived from the schema rather than trusted: a key added to the schema and not here would be dropped
    // from every restore, which is the same silent-loss failure one level along.
    const schema = stripComments(readFileSync('server/src/api/media-config.ts', 'utf8'));
    const block = schema.slice(schema.indexOf('const DocumentProcessingPatchSchema = z.object'));
    const declared = [...block.slice(0, block.indexOf('}).strict()')).matchAll(/^\s{2}(\w+):/gm)].map(m => m[1]);
    const helper = stripComments(readFileSync('testing/sync/helpers.js', 'utf8'));
    const accepted = [...helper.slice(helper.indexOf('const ACCEPTED = ['))
      .slice(0, 400).matchAll(/'(\w+)'/g)].map(m => m[1]);

    // `assistModel` is a nested object the restore has no business rewriting, so it is deliberately excluded.
    const missing = declared.filter(k => k !== 'assistModel' && !accepted.includes(k));
    assert.deepEqual(missing, [], `the patch schema accepts these and the restore filter drops them: ${missing}`);
    const extra = accepted.filter(k => !declared.includes(k));
    assert.deepEqual(extra, [], `the restore filter sends these and the schema refuses them: ${extra}`);
  });
});
