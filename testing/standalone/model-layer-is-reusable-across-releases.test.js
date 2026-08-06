/**
 * The embedding-model layer must be reusable across releases.
 *
 * ## The measurement this exists for (canary C-L5-5 / internal "P2")
 *
 * An operator compared two published images against the registry:
 *
 *     2.3.0 → 2.4.0   shared 5 of 16 layers (76.2 MiB, ~7%), re-downloaded 1024.4 MiB (93.5%)
 *
 * The single largest layer is the 482.5 MiB embedding model, and **its digest changed on a release that did not
 * change the model**. It recurs on every release, onto a node whose RAID1 has been degraded to a single drive
 * since 2026-07-03.
 *
 * ## Why "it is above the source COPYs" was not enough
 *
 * The warm step was a `RUN` in the production stage, deliberately placed above the app-source COPYs so a source
 * change would not invalidate it. True, and beside the point: it still sat below the ffmpeg apt layer and below
 * `COPY --from=prod-deps node_modules`. A dependency bump re-executed it — and `apt-get update` is not
 * reproducible, so an unchanged dependency tree could do it too.
 *
 * **A pull compares content digests, not cache keys.** A rebuilt layer that comes out byte-identical is not
 * downloaded again. So the question is what makes a re-materialised layer byte-identical, and the answer was
 * MEASURED over four builds of a minimal reproduction, forcing the copy to re-execute against a changed
 * upstream stage:
 *
 *     COPY --from=warm /model-cache /app/model-cache        → layer digest CHANGED
 *     COPY marker.txt ./              (a 7-byte file!)      → layer digest CHANGED
 *     RUN --mount=from=warm … + stamp the tree AND /app     → layer digest IDENTICAL
 *
 * The 7-byte COPY moving is the whole finding: **adding an entry to a directory bumps that directory's mtime,
 * and the bumped parent ships in the same layer as the payload.** Stamping the copied tree cannot reach `/app`.
 * It is the same shape as the original bug — the old warm step created and deleted `/app/server/warm.mjs`, so
 * 482.5 MiB moved because of one directory timestamp — and the obvious fix reintroduces it via a different
 * directory. Nothing about a `COPY --from` announces that; only building it twice does.
 *
 * So the invariants below are about **determinism**: every entry the shipped layer contains must have a fixed
 * mtime, including the destination's parent. Ordering, which the previous attempt got right, is not among them.
 *
 * ## What this can and cannot check
 *
 * The Dockerfile, because that runs everywhere in milliseconds — the same split `notice-ships-in-the-image`
 * makes. The EFFECT on the real image (two releases, identical layer digest) can only be confirmed against two
 * published manifests with the same layer structure, which is a release-time check and is recorded as such in
 * the tracker. This asserts the cause so the cause cannot quietly regress in between.
 *
 * Run: node --test testing/standalone/model-layer-is-reusable-across-releases.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8');

/** Text of one build stage: from its `FROM … AS <name>` to the next `FROM`, or the end of the file. */
function stage(name) {
  const at = dockerfile.search(new RegExp(`^FROM[^\\n]*\\bAS ${name}\\b`, 'm'));
  assert.ok(at >= 0, `no build stage named '${name}' in the Dockerfile`);
  const rest = dockerfile.slice(at + 1);
  const next = rest.search(/^FROM /m);
  return next >= 0 ? rest.slice(0, next) : rest;
}

/** The instruction lines of a stage, with comments stripped — a comment must never satisfy these checks. */
function instructions(name) {
  return stage(name).split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
}

describe('the model layer is built where a rebuild cannot change its digest', () => {
  it('the download happens in a stage that is thrown away, not in production', () => {
    // The model id is the fingerprint of the warm step: whichever stage names it is the one that downloads.
    const warm = instructions('model-warm');
    assert.match(warm, /nomic-ai\/nomic-embed-text/, 'the model-warm stage must be the one that warms the model');
    assert.doesNotMatch(instructions('production'), /nomic-ai\/nomic-embed-text/,
      'production downloads the model again — a RUN that downloads can never produce a stable layer digest');
  });

  it('brings the model in by mounting the warm stage, not by COPYing from it', () => {
    // Measured: a plain `COPY --from` re-materialises with a new digest, because it bumps the destination
    // directory's mtime into its own layer. A mounted copy inside a RUN can stamp that directory; a COPY cannot.
    const prod = instructions('production');
    assert.match(prod, /RUN --mount=from=model-warm[^\n]*source=\/model-cache/,
      'the model must arrive via a mount, or its layer digest moves on every rebuild');
    assert.doesNotMatch(prod, /^COPY --from=model-warm/m,
      'a `COPY --from` cannot stamp the destination parent, so its layer can never be reused across releases');
  });

  it('stamps EVERY entry the shipped layer contains, including the parent directory', () => {
    // Both halves, because the tree alone is what the first attempt did and it was measurably not enough.
    const prod = instructions('production');
    assert.match(prod, /find \/app\/model-cache -exec touch -h -d '@1'/,
      'the model tree must be stamped to a fixed mtime');
    assert.match(prod, /touch -h -d '@1' \/app(\s|$)/,
      "/app's mtime is bumped by writing into it and ships in this layer — unstamped, it moves 482.5 MiB");
  });

  it('writes its temp script where node resolves, and not into the tree that is read out', () => {
    // Both directions, because getting either wrong is silent-ish and I got each wrong once:
    //
    //  - OUTSIDE `/model-cache`: a create-and-delete leaves the parent directory's new mtime in the same
    //    changeset, which is the original 482.5 MiB regression (it was `/app/server` then).
    //  - UNDER `/app`: node resolves a bare `@huggingface/transformers` import by walking up from the SCRIPT's
    //    directory for `node_modules`. Moving the script to `/` to satisfy the first rule failed the build
    //    outright — there is no `/node_modules`. That is a hard failure rather than a silent one, but only if
    //    somebody builds the image; `docker buildx build --check` passes it happily.
    const warm = instructions('model-warm');
    const script = warm.match(/>\s*(\S*warm\.mjs)/)?.[1];
    assert.ok(script, 'could not find where the warm stage writes its script');
    assert.doesNotMatch(script, /^\/model-cache\//,
      `the warm script is written to ${script}, inside the tree the production stage reads out — its `
      + 'create-and-delete puts a directory mtime in the same layer as the model');
    assert.match(script, /^\/app\//,
      `the warm script is at ${script}; node cannot resolve @huggingface/transformers from there, and the `
      + 'build fails');
  });

  it('sets ownership inside the layer that ships, not in a later recursive chown', () => {
    // A `chown -R` in its own layer rewrites every file's metadata, so Docker copies the whole tree into a SECOND
    // layer. It did: the published image shipped the embedding model twice, in every tag, on every pull.
    const prod = instructions('production');
    const modelRun = /RUN --mount=from=model-warm[\s\S]*?(?=\n(?:[A-Z]+ |$))/.exec(prod)?.[0] ?? '';
    assert.match(modelRun, /chown -R node:node \/app\/model-cache/,
      'ownership must be set inside the same RUN that materialises the tree');
    const after = prod.slice(prod.indexOf(modelRun) + modelRun.length);
    assert.doesNotMatch(after, /chown -R[^\n]*model-cache/,
      'a later recursive chown of the model cache ships the model twice');
  });

  it('still serves the model from the path the server reads', () => {
    // The whole restructure must be invisible at runtime: `embedding.ts` reads MODEL_CACHE_DIR, the offline
    // guarantee depends on that directory being populated, and three other tests assert on this path.
    assert.match(instructions('production'), /^ENV MODEL_CACHE_DIR=\/app\/model-cache$/m);
  });
});
