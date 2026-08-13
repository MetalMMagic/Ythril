/**
 * Remove comments from source before a gate reads it — LINE comments first.
 *
 * ## Why the order is the whole point
 *
 * `server/src/api/data.ts:281` reads:
 *
 *     // Follow the symlink — useful for /mnt/* or volume-mount points
 *
 * A stripper that removes block comments FIRST sees that `/*` as an opener and deletes everything through the
 * next `*​/` — **5,907 characters**, taking `PUT /backup-config`, `POST /restore` and `POST /migrate` with it.
 * Removing line comments first makes the phantom opener disappear along with its line.
 *
 * That is not hypothetical. It made the capability matrix report 202 routes when the routers serve 208, and
 * before that it kept three mutating `/api/files` routes invisible to `every-space-route-has-an-area` — so they
 * carried no rights row for as long as nothing could see them.
 *
 * ## Two variants, because gates want different things
 *
 * `stripComments` also removes TRAILING comments (`const x = 1; // note`), guarding `://` so a URL survives.
 * `stripFullLineComments` removes only comment-only lines, which is what a gate wants when it asserts on code
 * that carries explanatory trailing comments.
 *
 * Both put line comments first. `comment-strippers-are-ordered.test.js` fails on the other order anywhere in the
 * suite; the 57 files that still carry their own copy are correct today and tracked for migration as `Q-1`.
 */

/** Comments out, including trailing ones. `://` is preserved so URLs are not truncated. */
export function stripComments(src) {
  return src
    .replace(/(^|[^:])\/\/.*/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Comment-only lines out; a trailing comment on a line of code is left alone. */
export function stripFullLineComments(src) {
  return src
    .replace(/^[ \t]*\/\/.*/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}
