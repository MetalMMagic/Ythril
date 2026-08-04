/**
 * A workflow that fails to START looks almost exactly like a workflow that ran and failed.
 *
 * ## The failure this exists for
 *
 * `cla.yml` shipped in #665 with `if: ${{ secrets.CLA_SIGNATURES_TOKEN == '' }}` on a step. The `secrets` context
 * is **not available in an `if:` conditional** — only in `env:` and `with:`. So the expression was invalid, and
 * GitHub responded the way it does to any invalid workflow: it created a run for every push, concluded it
 * **failure**, ran **zero jobs**, and emailed about each one.
 *
 * The consequence was not the email. It was that **the CLA was never enforced at all** — from the day the check
 * was added, it had never once executed, while the runs list showed activity and the repository looked guarded.
 * The owner noticed because of the noise; nothing in this repo would have.
 *
 * The tell, in the runs list, is `event: push` on a workflow that has no `push` trigger, plus "No jobs were run".
 *
 * ## What this checks
 *
 * The static half of what GitHub's validator would have caught, offline: every workflow parses as YAML, declares
 * a trigger and at least one job, and — the specific trap — never reads `secrets` from a place where the context
 * does not exist.
 *
 * It cannot replace GitHub's own validation. It closes the class of error that costs a silent, invisible outage.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';

const DIR = join(process.cwd(), '.github', 'workflows');
const files = readdirSync(DIR).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

describe('every workflow would start', () => {
  it('found the workflows (guards against a vacuous pass)', () => {
    assert.ok(files.length >= 3, `expected several workflows, found ${files.length}`);
  });

  it('each one parses, and declares a trigger and a job', () => {
    for (const f of files) {
      const doc = load(readFileSync(join(DIR, f), 'utf8'));
      assert.ok(doc && typeof doc === 'object', `${f}: does not parse to a mapping`);
      // `on:` is YAML 1.1 truthy, so js-yaml gives the key back as boolean true. Accept either.
      const triggers = doc.on ?? doc[true];
      assert.ok(triggers, `${f}: no 'on:' trigger`);
      assert.ok(doc.jobs && Object.keys(doc.jobs).length > 0, `${f}: no jobs`);
      for (const [name, job] of Object.entries(doc.jobs)) {
        assert.ok(job['runs-on'] || job.uses, `${f}: job '${name}' has neither runs-on nor uses`);
      }
    }
  });

  it('no `if:` reads the secrets context — the exact trap that silently disabled cla.yml', () => {
    // GitHub rejects the whole workflow rather than the one expression, so the blast radius is every job in the
    // file. Read the secret through `env:` and test it in the shell instead.
    const bad = [];
    for (const f of files) {
      const raw = readFileSync(join(DIR, f), 'utf8');
      raw.split('\n').forEach((line, i) => {
        // `if:` at any nesting, containing `secrets.` anywhere in the expression.
        if (/^\s*if:\s/.test(line) && /\bsecrets\s*\./.test(line)) {
          bad.push(`${f}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    assert.deepEqual(bad, [],
      'the `secrets` context is unavailable in `if:`; GitHub treats this as an invalid workflow, so every run '
      + 'becomes a startup failure with zero jobs — which reads as a failing check rather than a check that '
      + 'never ran:\n  ' + bad.join('\n  '));
  });

  it('a job that needs a PAT does not silently fall back to GITHUB_TOKEN', () => {
    // Adjacent trap: `pull_request_target` from a fork gets a read-only GITHUB_TOKEN, so a job that must write
    // has to be handed a PAT explicitly. If a workflow names a PAT-ish secret it should actually pass it.
    for (const f of files) {
      const raw = readFileSync(join(DIR, f), 'utf8');
      if (!/PERSONAL_ACCESS_TOKEN|_TOKEN:\s*\$\{\{\s*secrets\./.test(raw)) continue;
      assert.match(raw, /\$\{\{\s*secrets\.[A-Z_]+\s*\}\}/,
        `${f}: references a token but never interpolates a secret`);
    }
  });
});
