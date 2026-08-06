/**
 * Every route that accepts `typeSchemas` refuses a broken library `$ref`.
 *
 * ## The report
 *
 * An operator setting up a NEW space declared a type as `{"$ref": "library:cross-space-reference"}` and it
 * came back as `{}` — while the create reported success. Their words: *"in a `strict` space, one mistyped ref
 * removes every constraint from a type and reports success"*, and they noted the behaviour is inconsistent
 * with the full-replace route, which returns 422.
 *
 * They were right, and the asymmetry was narrower than they could see from outside: the three routes that
 * EDIT meta — `PATCH /:id`, `PUT /:id/schema`, `PUT /:id/meta/typeSchemas/:kt/:name` — all answered 422
 * already. Only `POST /` did not, so the identical mistake was loud on every path except the one people make
 * it on, which is the one where the space and its schema arrive together.
 *
 * It matters most in a `strict` space, and `POST /` is the handler that SEEDS `validationMode: 'strict'`: one
 * mistyped ref leaves that type with no constraints, and the space then accepts anything for it while its
 * schema looks authored.
 *
 * ## Why this is derived rather than a list of four routes
 *
 * A list would have been written against the routes that existed and agreed with itself. This finds every
 * route handler that takes `typeSchemas` from a request and requires each one to consult the checker — so a
 * fifth route added later is covered on the day it is written, which is the only time it is cheap.
 *
 * Run: node --test testing/standalone/broken-library-ref-refused-everywhere.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = 'server/src/api/spaces.ts';
const src = readFileSync(join(ROOT, SRC), 'utf8');

/** Split the file into route handlers: from one `spacesRouter.<verb>(` to the next. */
function routes() {
  const starts = [];
  const re = /spacesRouter\.(get|post|put|patch|delete)\(\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src)) !== null) starts.push({ verb: m[1], path: m[2], at: m.index });
  return starts.map((s, i) => ({
    ...s,
    body: src.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : src.length),
  }));
}

describe('a broken schema-library $ref is refused on every route that accepts one', () => {
  const all = routes();

  it('found the routes to check', () => {
    // Floors the enumeration — a changed router name would otherwise make every check below vacuous.
    assert.ok(all.length >= 10, `only found ${all.length} route handlers in ${SRC}`);
    assert.ok(all.some(r => r.verb === 'post' && r.path === '/'), 'the space-create route must be among them');
  });

  it('every handler that reads typeSchemas from the request consults the ref checker', () => {
    const offenders = [];
    for (const r of all) {
      // Only mutating handlers that take schemas from the CALLER. A read route returning them is not
      // accepting a ref and has nothing to reject.
      if (!['post', 'put', 'patch'].includes(r.verb)) continue;
      // `meta` counts, not just a literal `typeSchemas`. The route that had the defect destructured `meta`
      // from the body and never named `typeSchemas` at all — a detector keyed on that word would have
      // reported the tree clean on the day the bug was live, which is the one day it needed to speak.
      const takesSchemas = /typeSchemas/.test(r.body)
        || /const \{[^}]*\bmeta\b[^}]*\} = parsed\.data/.test(r.body);
      if (!takesSchemas) continue;
      if (!/findBrokenLibraryRefs\(/.test(r.body)) offenders.push(`${r.verb.toUpperCase()} ${r.path}`);
    }
    assert.deepEqual(offenders, [],
      'these accept `typeSchemas` from a request without checking its library refs. An unresolvable ref '
      + 'degrades to an empty schema, so in a strict space the type silently loses every constraint while '
      + 'the call reports success — and the other routes answer 422 for the same input.');
  });

  it('the create route refuses BEFORE the space exists', () => {
    // Ordering is the guarantee: a check after `createSpace` would leave a space behind whose schema is the
    // thing being rejected, and the caller would have to clean it up.
    const create = all.find(r => r.verb === 'post' && r.path === '/');
    const check = create.body.indexOf('findBrokenLibraryRefs(');
    const write = create.body.indexOf('await createSpace(');
    assert.ok(check > 0, 'the create route must call the checker');
    assert.ok(write > check, 'the ref check must run before the space is created');
  });

  it('all four answer with the same status and a message naming what is missing', () => {
    const checking = all.filter(r => /findBrokenLibraryRefs\(/.test(r.body));
    assert.ok(checking.length >= 4, `only ${checking.length} routes check refs; expected the create route plus three editors`);
    for (const r of checking) {
      assert.match(r.body, /res\.status\(422\)/, `${r.verb.toUpperCase()} ${r.path} must answer 422`);
      assert.match(r.body, /Schema library[^\n]*not found/,
        `${r.verb.toUpperCase()} ${r.path} must name the missing entry — "invalid schema" sends the caller looking in the wrong place`);
    }
  });
});
