/**
 * No customer's name appears in this repository. It is PUBLIC.
 *
 * ## Why this exists
 *
 * Two party names had reached **231 occurrences across 106 tracked files** — 46 of them in `CHANGELOG.md`,
 * which is republished verbatim as the GitHub Release notes, and six in the integration guide, which ships
 * inside the Docker image. The rest were source comments and test titles, every one of them public.
 *
 * They got there honestly: this codebase records WHO reported a defect and WHAT they measured, because a
 * finding with a source behind it is worth more than an assertion. The evidence is worth keeping. The identity
 * is not ours to publish — the owner's rule, 2026-08-28: *"no specific customer should be mentioned anywhere
 * public"*.
 *
 * So the substitution kept the observation and dropped the name: a party became **the role that made the
 * observation matter** — the operator who runs the instances, the integrator who consumes the API. *"22.150 s,
 * measured by the canary operator"* carries exactly the weight it did before.
 *
 * ## Why this is a gate and not a cleanup
 *
 * A one-time sweep is undone by the next commit that says "reported by …", and there is every reason to keep
 * writing that sentence — it is how this repo cites its sources. Only a gate makes the substitution the default
 * rather than something somebody has to remember at the moment they are least thinking about it.
 *
 * ## Why the names are encoded here
 *
 * A gate holding the literal it forbids would defeat itself: this file is in the same public repository. The
 * names live base64-encoded and are decoded at run time, so the pattern is still proven against the real string
 * without the real string being published. That is not obfuscation for its own sake — the alternative is a gate
 * that is itself the last remaining leak.
 *
 * Run: node --test testing/standalone/no-customer-names-in-public.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, sep } from 'node:path';

const ROOT = process.cwd();

/**
 * The forbidden names, base64-encoded — see the header for why.
 *
 * Add a party here when a new one starts reporting. The role that replaces it belongs in the substitution note
 * beside it, so the next person writes the same replacement rather than inventing a second one for the same
 * party.
 */
const FORBIDDEN = [
  { encoded: 'YnJlaXR1YWk=', replaceWith: 'the canary operator' },
  { encoded: 'YWlnZW50cw==', replaceWith: 'the fleet integrator' },
];

const names = FORBIDDEN.map(f => ({
  name: Buffer.from(f.encoded, 'base64').toString('utf8'),
  replaceWith: f.replaceWith,
}));

/** THIS file is excluded: it holds the names encoded, and a decoded scan of itself would match them. */
const SELF = 'no-customer-names-in-public.test.js';

function trackedFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  return out.split(/\r?\n/).filter(Boolean);
}

/** Text of a tracked file, or null when it is binary or unreadable. */
function textOf(rel) {
  try {
    const buf = readFileSync(join(ROOT, rel));
    if (buf.includes(0)) return null;                 // an asset, not prose
    return buf.toString('utf8');
  } catch {
    return null;
  }
}

describe('the scan works before anything is concluded from it', () => {
  it('walks a real file list', () => {
    // A scan of nothing reports every rule below as satisfied.
    const files = trackedFiles();
    assert.ok(files.length > 200, `only ${files.length} tracked files — the walk is broken`);
    assert.ok(files.includes('CHANGELOG.md'), 'the changelog is not in the walk, and it is where 46 of them were');
  });

  it('the names decode to something real', () => {
    // If the encoding were wrong, every file would pass by being searched for the empty string or for nonsense.
    for (const { name } of names) {
      assert.ok(name.length >= 6, `a forbidden name decoded to "${name}" — check the base64`);
      assert.match(name, /^[a-z][a-z0-9-]+$/, `"${name}" does not look like a party id`);
    }
    assert.equal(names.length, 2, 'both parties must be listed, or one of them is unguarded');
  });

  it('the matcher would catch the shape it is about', () => {
    // Proven against a literal built at run time, so a matcher that silently stopped working cannot pass as
    // "none found".
    const sample = `reported by ${names[0].name}-platform, 2026-08-20`;
    assert.match(sample, new RegExp(names[0].name, 'i'), 'the matcher no longer matches a party mention');
  });
});

describe('no customer name in any tracked file', () => {
  it('not in prose, not in a comment, not in a test title, not in a URL', () => {
    const offenders = [];
    for (const rel of trackedFiles()) {
      if (rel.endsWith(SELF)) continue;
      const text = textOf(rel);
      if (text === null) continue;
      for (const { name, replaceWith } of names) {
        const re = new RegExp(name, 'gi');
        const hits = [...text.matchAll(re)];
        if (hits.length === 0) continue;
        const line = text.slice(0, hits[0].index).split('\n').length;
        offenders.push(`${rel.split(sep).join('/')}:${line} — ${hits.length} mention(s); say "${replaceWith}"`);
      }
    }
    assert.deepEqual(offenders, [],
      'This repository is PUBLIC, and a customer\'s name must not appear in it — in prose, in a comment, in a\n'
      + 'test title or in an example URL. Keep the OBSERVATION and drop the identity: replace the party with the\n'
      + 'role that made the observation matter, and an example domain with `example.com`. A finding still carries\n'
      + 'its full weight as "measured by the canary operator".\n'
      + offenders.join('\n'));
  });
});
