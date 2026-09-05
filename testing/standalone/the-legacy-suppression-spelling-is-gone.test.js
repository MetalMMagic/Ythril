/**
 * `excludeFromVectorSearch` is gone — both halves of it, everywhere.
 *
 * `_DEPRECATIONS.md` row 1.8: the pre-3.1.0 spelling of the per-record never-embed mark. It has two halves
 * and they have to go together, because either one left behind is worse than both staying:
 *
 *  - the **input alias**, read by `parseRecordSuppression` — the one place either door accepted it;
 *  - the **stored key**, written beside the current spelling, read back as a fallback, excluded from the
 *    not-suppressed filter, declared on four record types, hashed by `merkle.ts`, projected by `reindex.ts`,
 *    and accepted by five `Incoming*` ingest schemas.
 *
 * Leave the stored key and drop the input and a record already carrying it keeps working while nobody can
 * set it — two spellings, one readable. Drop the stored key and keep the input and a caller is told 201 for
 * a field that is written and never read.
 *
 * ## Why it could not go before now
 *
 * A peer below 3.1.0 does not know the current spelling, strips it on ingest, and replicates its
 * unsuppressed copy onward: content an author marked never-embed reaches an embedding model and returns to
 * ranked search, silently, on every instance. The peer floor (`N-1`) is this instance's own MAJOR, so only a
 * 4.x build refuses every 3.x peer.
 *
 * **The development tree is 3.4.0 and its floor is 3.0.0, which admits exactly that peer.** That is not a
 * hazard, because reaching anyone requires a RELEASE, and the owner ruled on 2026-09-05 that there will be
 * none before 4.0. So the check lives in `release-gate.mjs`, where a tag is refused if this key is gone and
 * the major is below 4 — the moment the assumption is actually tested, rather than an always-on gate that
 * would keep the tree red for a risk that development cannot reach.
 *
 * Run: node --test testing/standalone/the-legacy-suppression-spelling-is-gone.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripComments } from './_strip-comments.mjs';

const LEGACY = 'excludeFromVectorSearch';

/** Tracked server sources only, comments stripped — a docblock explaining the removal is not a use. */
function serverSources() {
  return execFileSync('git', ['ls-files', 'server/src'], { encoding: 'utf8' })
    .split('\n').map(s => s.trim()).filter(f => f.endsWith('.ts'));
}

describe('the legacy spelling is gone from the server', () => {
  it('the sweep sees the sources at all', () => {
    // The vacuity guard: a `git ls-files` that returns nothing would report a clean removal over no files.
    const files = serverSources();
    assert.ok(files.length > 100, `only ${files.length} server sources found — the sweep is measuring nothing`);
  });

  it('and the current spelling is still there, so this is a REMOVAL and not a rename', () => {
    /*
     * The second vacuity guard, and the more important one. If `suppressEmbeddings` had gone too, every
     * assertion below would pass over a feature that no longer exists — which is not what row 1.8 asks for.
     */
    const src = stripComments(readFileSync('server/src/brain/suppress-embeddings.ts', 'utf8'));
    assert.match(src, /suppressEmbeddings/,
      'the current spelling is gone as well — this row retires one of two spellings, not the feature');
  });

  it('NO server source mentions it, in code or in a type', () => {
    const offenders = serverSources()
      .filter(f => stripComments(readFileSync(f, 'utf8')).includes(LEGACY));
    assert.deepEqual(offenders, [],
      `${offenders.join(', ')} still names \`${LEGACY}\`. Both halves go together: the input alias and the `
      + 'stored key, including its declaration on the record types, its row in the merkle projection, its '
      + 'reindex projections and its six ingest schemas.');
  });
});

describe('the doors refuse it rather than ignoring it', () => {
  it('the REST unknown-field list no longer excuses it', () => {
    /*
     * `unknown-fields.ts` is what turns an unrecognised key into a refusal. While the legacy name sits on
     * its allowed list, a body carrying it is accepted and dropped — a 201 for a field nothing reads, which
     * is the exact failure `.strict()` exists to prevent one file over.
     */
    const src = stripComments(readFileSync('server/src/api/brain/unknown-fields.ts', 'utf8'));
    assert.ok(!src.includes(LEGACY) && !src.includes('LEGACY_RECORD_SUPPRESS_FIELD'),
      'the REST doors still allow the legacy field through, so it is accepted and silently dropped');
  });

  it('and no MCP tool schema declares it', () => {
    /*
     * MCP schemas are `additionalProperties: false` and the dispatcher validates before the handler, so
     * removing the property is what makes the tools refuse the field — the refusal is the absence.
     */
    const offenders = execFileSync('git', ['ls-files', 'server/src/mcp'], { encoding: 'utf8' })
      .split('\n').map(s => s.trim()).filter(f => f.endsWith('.ts'))
      .filter(f => stripComments(readFileSync(f, 'utf8')).includes(LEGACY));
    assert.deepEqual(offenders, [],
      `${offenders.join(', ')} still declares the legacy field, so the tool accepts it`);
  });
});

describe('and the release gate holds the version it may ship under', () => {
  it('a tag below 4.0 is refused while the key is gone', () => {
    /*
     * The protection that replaced an always-on gate. Asserted on the check's presence rather than by
     * running it, because running it means minting a fake manifest — and the shape being protected is that
     * somebody does not quietly delete the check while removing something else.
     */
    const gate = stripComments(readFileSync('scripts/release-gate.mjs', 'utf8'));
    assert.match(gate, /checkStoredShapeMatchesMajor/,
      'the release gate no longer refuses a pre-4.0 tag carrying the removed stored shape');
    assert.match(gate, /major < 4/,
      'the release gate mentions the check but no longer tests the major');
  });
});
