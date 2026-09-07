/**
 * What files the repository actually has — the one implementation, with the floor built in.
 *
 * ## Why this exists, and it is a self-inflicted example
 *
 * `Q-6` spent six rounds converting gates that asserted a whole set while reading a hand-written list of
 * files. Every conversion replaced the list with the same four lines: shell out to `git ls-files`, split,
 * filter by extension, assert a floor. By the end that block existed about ten times, written by the same
 * sweep whose entire subject is *"a rule written twice is a rule that can be wrong once"*.
 *
 * Owner, 2026-09-07: *"when you find copies i always think 'why is that not a reusable module then?'"*
 *
 * ## The floor is INSIDE, and that is the point of the module
 *
 * An empty listing passes every loop written over it, so a gate whose scan is broken reports success about
 * nothing at all. That is the same defect one level up from what these gates check, and it is the half a
 * copy is most likely to omit — it is the line that looks like boilerplate.
 *
 * Here it cannot be omitted: asking for the sources gives you the floor whether you remembered it or not.
 *
 * ## Why `git ls-files` rather than reading the directory
 *
 * `todo/`, `node_modules/` and every build output are gitignored, and a `readdirSync` walk finds them. The
 * question these gates ask is *"what does this repository contain"*, and git is the only thing that answers
 * it — see `gitignored-files-break-local-checks` in the reference notes.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Tracked files under `dirs`, filtered by extension, with a minimum asserted.
 *
 * @param {string|string[]} dirs      one or more paths, as `git ls-files` takes them
 * @param {object}          [opts]
 * @param {string[]}        [opts.ext] extensions to keep, default `['.ts']`
 * @param {number}          [opts.floor] the minimum that means the scan worked, default 100
 * @param {string[]}        [opts.exclude] exact paths to drop — the module that DEFINES the thing under test
 * @param {boolean}         [opts.specs] include `.spec.ts`, default true. The one real second question:
 *                                       "what does the PRODUCT contain" against "what does the repo contain".
 * @returns {string[]} repo-relative paths, forward slashes, as git prints them
 *
 * `.d.ts` is never returned. A declaration file is not a source in the sense any of these gates mean, and
 * every caller that hand-rolled this excluded it — which is what makes it a default rather than an option.
 */
export function trackedSources(dirs, opts = {}) {
  const { ext = ['.ts'], floor = 100, exclude = [], specs = true } = opts;
  const paths = Array.isArray(dirs) ? dirs : [dirs];

  const listed = execFileSync('git', ['ls-files', ...paths], { cwd: REPO_ROOT, maxBuffer: 32 * 1024 * 1024 })
    .toString('utf8').split('\n')
    .map(f => f.trim())
    .filter(f => f
      && ext.some(e => f.endsWith(e))
      && !f.endsWith('.d.ts')
      && (specs || !f.endsWith('.spec.ts'))
      && !exclude.includes(f));

  if (listed.length < floor) {
    // THROWS rather than returning empty. A caller that gets `[]` loops over nothing and reports a green
    // tick, which is exactly the failure the floor exists to prevent — so the failure has to be the listing's
    // own, not something each caller has to remember to check for.
    throw new Error(
      `only ${listed.length} file(s) found under ${paths.join(', ')} with a floor of ${floor}. The listing is `
      + 'broken, not the code: an empty scan passes every loop written over it, so this fails loudly rather '
      + 'than reporting success about nothing.');
  }
  return listed;
}

/** Every tracked source, read. Saves the `map(readFileSync)` that follows every one of these scans. */
export function readTrackedSources(dirs, opts = {}) {
  return trackedSources(dirs, opts).map(f => ({ file: f, text: readFileSync(join(REPO_ROOT, f), 'utf8') }));
}
