/**
 * No build step downloads the CUDA execution provider — not CI, not the image.
 *
 * ## Why this is a gate and not a comment
 *
 * `onnxruntime-node` fetches its CUDA binaries from a GitHub release on postinstall. On a machine with no
 * `nvcc` it logs *"nvcc not found. Assuming CUDA 12"* and downloads the GPU tarball **anyway**. Two CI runs
 * failed 35 minutes apart on that download alone, which is what put `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` on
 * both `npm ci` steps in the workflows.
 *
 * The Dockerfile was left out at the time and parked as P-5, because skipping it in the image is a product
 * decision rather than a build fix: a GPU deployment loses the execution provider and would need its own
 * image variant. Owner ruled A on 2026-08-15 — skip it there too. Nothing in the published image uses it; the
 * bundled embedder runs on CPU.
 *
 * A build that reaches github.com for a tarball nothing loads is a build that fails for a reason unrelated to
 * the change being built, and the image build is the one most likely to run somewhere with neither a fast nor
 * a reliable route there.
 *
 * ## What it checks, and the trap it is built around
 *
 * Every `npm ci` in the Dockerfile must be preceded by the skip. `ENV` does **not** cross a stage boundary, so
 * one declaration at the top would silently cover only the first stage — exactly the kind of thing a reader
 * assumes and a build disproves quietly, by working on a fast connection.
 *
 * Run: node --test testing/standalone/cuda-download-is-skipped-everywhere.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const SKIP = 'ONNXRUNTIME_NODE_INSTALL_CUDA';
const read = (p) => readFileSync(p, 'utf8');

/** Dockerfile lines, comments dropped — a `#` line naming the variable must not satisfy the check. */
const dockerLines = () =>
  read('Dockerfile').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

describe('the CUDA download is skipped in every build', () => {
  it('every npm ci in the Dockerfile has the skip in force', () => {
    // Walked in order and reset at each FROM, because ENV does not survive a stage boundary. Checking mere
    // PRESENCE anywhere in the file would pass on one declaration covering one of three stages.
    const lines = dockerLines();
    let active = false;
    const unguarded = [];
    for (const l of lines) {
      if (/^FROM\s/i.test(l)) { active = false; continue; }
      if (new RegExp(`^ENV\\s+${SKIP}\\s*=\\s*skip`, 'i').test(l)) { active = true; continue; }
      if (/^RUN\s+.*npm ci/.test(l) && !active && !l.includes(SKIP)) unguarded.push(l);
    }
    assert.deepEqual(unguarded, [], `these run npm ci with the CUDA download still enabled:\n  ${unguarded.join('\n  ')}`);
  });

  it('finds the npm ci steps at all — the scanner before the property', () => {
    const count = dockerLines().filter((l) => /^RUN\s+.*npm ci/.test(l)).length;
    assert.ok(count >= 3, `parsed only ${count} npm ci steps — the scanner is wrong, not the Dockerfile`);
  });

  it('both workflows still carry it', () => {
    // The half that was already true, re-asserted: this gate exists because the setting was applied in one
    // place and not another, and a gate that only watches the new place would let the old one lapse.
    const wf = execSync('git ls-files ".github/workflows/*.yml"', { encoding: 'utf8' })
      .split('\n').map((l) => l.trim()).filter(Boolean);
    const withCi = wf.filter((f) => read(f).includes('npm ci'));
    assert.ok(withCi.length >= 2, `expected at least two workflows running npm ci, found ${withCi.length}`);
    const missing = withCi.filter((f) => !read(f).includes(`${SKIP}: skip`));
    assert.deepEqual(missing, [], `these workflows run npm ci without the skip: ${missing.join(', ')}`);
  });
});
