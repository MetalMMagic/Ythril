/**
 * `PINNABLE_FIELD_PATHS` must match what the admin API can actually write, and what the loader can actually lock.
 *
 * ## Why there are two copies at all
 *
 * A pin means *"the API must refuse to change this"*, so the authoritative vocabulary is
 * `MediaConfigPatchSchema` — the set of fields `PATCH /api/admin/media-config` accepts. Deriving the list from it
 * at runtime is the obvious design and it is **not possible**: the schema lives in `api/media-config.ts`, which
 * imports the loader, and its reranker bounds come from `brain/rerank-client.ts`, which imports the loader too.
 * Importing it back would evaluate `z.number().min(MIN_CANDIDATE_MULTIPLIER)` with `undefined` on one leg of the
 * cycle.
 *
 * So the loader carries a second copy, deliberately — and this file is the reason that is acceptable. A coverage
 * check can only see that the list exists; **drift needs the copies compared**, which is what happens here.
 *
 * ## Three copies, actually, and each catches a different mistake
 *
 * 1. `PINNABLE_FIELD_PATHS` — what a pin may name.
 * 2. `MediaConfigPatchSchema` — what the API can write. A field writable but not pinnable cannot be locked; a
 *    field pinnable but not writable would report as read-only while nothing could ever have changed it.
 * 3. The loader's own `locked.push('…')` calls — what an env var already pins. Every one of those must be
 *    nameable in the list, or the two pin mechanisms disagree about the same field.
 *
 * Run: node --test testing/standalone/pinnable-paths-match-the-writable-surface.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripComments } from './_strip-comments.mjs';

let PINNABLE_FIELD_PATHS;
before(async () => {
  ({ PINNABLE_FIELD_PATHS } = await import('../../server/dist/config/pinned-fields.js'));
});

/**
 * The writable surface, read out of the patch schema's SOURCE.
 *
 * Source rather than the compiled zod object, for the cycle above: importing the route module pulls in the loader
 * and the rerank client. The shape is regular enough to read — each block is `name: XPatchSchema.optional()` and
 * each schema is a `z.object({ field: … })` — and the parse is floored below so a pattern break cannot pass as an
 * empty answer.
 */
function writablePaths() {
  const src = stripComments(readFileSync('server/src/api/media-config.ts', 'utf8'));

  // Every `const XPatchSchema = z.object({ … })` and the fields inside it.
  const schemas = new Map();
  for (const m of src.matchAll(/const (\w+PatchSchema) = z\.object\(\{([\s\S]*?)\n\}\)/g)) {
    const fields = [...m[2].matchAll(/^\s{2}(\w+):/gm)].map(f => f[1]);
    schemas.set(m[1], fields);
  }

  const top = schemas.get('MediaConfigPatchSchema');
  assert.ok(top, 'MediaConfigPatchSchema not found — re-anchor this gate');

  const out = [];
  for (const field of top) {
    // Does this top-level key delegate to another schema, or is it a scalar?
    const line = new RegExp(`^\\s{2}${field}:\\s*(\\w+PatchSchema)`, 'm').exec(
      src.slice(src.indexOf('const MediaConfigPatchSchema')));
    if (line && schemas.has(line[1])) {
      for (const sub of schemas.get(line[1])) out.push(`${field}.${sub}`);
    } else {
      out.push(field);
    }
  }
  return out;
}

/** Every namespaced path an env var can already pin, read from the loader. */
function envPinnedPaths() {
  const src = stripComments(readFileSync('server/src/config/loader.ts', 'utf8'));
  return [...new Set([...src.matchAll(/locked\.push\('([a-zA-Z]+\.[a-zA-Z]+)'\)/g)].map(m => m[1]))];
}

describe('the parse of both other copies is checked before it is trusted', () => {
  it('found a real writable surface', () => {
    // An empty or tiny parse would make every comparison below pass over nothing and report agreement.
    const w = writablePaths();
    assert.ok(w.length >= 25, `only parsed ${w.length} writable paths — the pattern broke`);
    assert.ok(w.includes('rerank.apiKey'), 'the requested field is missing from the parse');
    assert.ok(w.includes('maxFileSizeBytes'), 'top-level scalars must be parsed too');
  });

  it('found the loader\'s env-pin list', () => {
    assert.ok(envPinnedPaths().length >= 15, 'the loader pin scrape broke');
  });
});

describe('pinnable vs writable', () => {
  it('every pinnable path is a field the API can actually write', () => {
    /*
     * The direction that produces a lie: a path in the list that the API cannot write would report the field as
     * read-only in the UI while nothing could ever have changed it. The operator would believe a pin took effect
     * on a control that was never live.
     */
    const writable = new Set(writablePaths());
    const notWritable = PINNABLE_FIELD_PATHS.filter(p => !writable.has(p));
    assert.deepEqual(notWritable, [],
      'these paths can be pinned but not written, so pinning them means nothing:\n' + notWritable.join('\n'));
  });

  it('every writable field can be pinned, except the ones deliberately excluded', () => {
    /*
     * The other direction: a field the API can write and a pin cannot name is a field an infra-managed deployment
     * cannot lock. `levels.*` is excluded on purpose — those are per-class CEILINGS with their own infra story
     * (`YTHRIL_MEDIA_INFRA_MANAGED` covers the whole block), and pinning one class while leaving the others
     * editable would express a policy the lattice does not have.
     */
    const EXCLUDED = (p) => p.startsWith('levels.');
    const pinnable = new Set(PINNABLE_FIELD_PATHS);
    const cannotPin = writablePaths().filter(p => !pinnable.has(p) && !EXCLUDED(p));
    assert.deepEqual(cannotPin, [],
      'these fields are writable but cannot be pinned, so an infra deployment cannot lock them:\n'
      + cannotPin.join('\n') + '\n(add them to PINNABLE_FIELD_PATHS, or exclude them here with a reason)');
  });
});

describe('pinnable vs what an env var already pins', () => {
  it('every env-pinnable path can also be named in the list', () => {
    /*
     * If `RERANK_MODEL` pins `rerank.model` but the list cannot name it, the two mechanisms disagree about the same
     * field — and an operator moving from per-field variables to one list would silently lose pins.
     */
    const pinnable = new Set(PINNABLE_FIELD_PATHS);
    const missing = envPinnedPaths().filter(p => !pinnable.has(p));
    assert.deepEqual(missing, [],
      'an env var pins these, but YTHRIL_PINNED_FIELDS cannot name them:\n' + missing.join('\n'));
  });

  it('and every face field the API can WRITE, which is not all of them', () => {
    /*
     * `FACE_RECOGNITION_ENV` has an env var per field, and the loader reports every one of them in
     * `lockedByInfra`. But three — `enabled`, `modelPath`, `reprocessSyncedImages` — are absent from
     * `FaceRecognitionPatchSchema` on purpose: the API never accepts them, so they are already unreachable and
     * there is no write for a pin to refuse. Listing them would let an operator believe a pin had done something.
     *
     * The exclusion is DERIVED from the patch schema rather than written out here, so it stays correct if one of
     * them ever becomes writable — the day that happens, this starts requiring it to be pinnable.
     */
    const loader = stripComments(readFileSync('server/src/config/loader.ts', 'utf8'));
    const block = loader.slice(loader.indexOf('const FACE_RECOGNITION_ENV'));
    const fields = [...block.slice(0, block.indexOf('};')).matchAll(/^\s{2}(\w+):\s*'FACE_/gm)].map(m => m[1]);
    assert.ok(fields.length >= 6, `only parsed ${fields.length} face fields — re-anchor this gate`);

    const writable = new Set(writablePaths());
    const pinnable = new Set(PINNABLE_FIELD_PATHS);
    const missing = fields
      .filter(f => writable.has(`faceRecognition.${f}`))
      .filter(f => !pinnable.has(`faceRecognition.${f}`));
    assert.deepEqual(missing, [],
      'these face fields are writable but cannot be named in a pin list:\n' + missing.join('\n'));

    // And the three unwritable ones must stay OUT, or the list starts claiming pins that refuse nothing.
    const unwritable = fields.filter(f => !writable.has(`faceRecognition.${f}`));
    assert.ok(unwritable.length >= 1, 'expected at least one face field the API cannot write — re-check the parse');
    const overclaimed = unwritable.filter(f => pinnable.has(`faceRecognition.${f}`));
    assert.deepEqual(overclaimed, [],
      'these face fields are not writable, so pinning them refuses nothing:\n' + overclaimed.join('\n'));
  });
});
