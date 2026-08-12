/**
 * Every parameter the recall route accepts must be reachable from the UI.
 *
 * ## The bug underneath the bug
 *
 * The owner asked where the search is that has all the fields `recall` accepts via MCP. It is the Brain →
 * Query tab's recall panel, and the answer was "ten of the twelve".
 *
 * `POST /api/brain/spaces/:spaceId/recall` has always accepted `traverse` (graph expansion, 0–5) and
 * `maxTimeMS` (a deadline that returns a PARTIAL answer instead of hanging). Both are validated by the route.
 * Both are documented on the MCP tool. Neither was **declared on the client's typed `recallBrain` body**, so
 * no component could send them and no form could offer them. A capability shipped on two surfaces and reached
 * the operator on neither.
 *
 * This is the repo's most-repeated shape — one rule, two surfaces, the weaker one silent — except here the
 * weaker surface did not implement a narrower version, it implemented nothing, which is harder to notice
 * because there is no wrong behaviour to observe. The route works. The MCP tool works. Only the human is
 * missing a control.
 *
 * ## Why the check is derived from the route
 *
 * A list of parameters written here by hand would go stale the moment the route gains one — the same failure
 * in a new place. So the accepted set is parsed out of the route itself, both from its destructure and from
 * the fields it reads off `req.body` separately, and every name found has to appear in two places on the
 * client: the typed request body (or it cannot be sent) and the recall submit call (or nothing sends it).
 *
 * Run: node --test testing/standalone/recall-params-reach-the-ui.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROUTE = 'server/src/api/brain/search.ts';
const API = 'client/src/app/core/brain-api.service.ts';
const PANEL = 'client/src/app/pages/brain/query-tab.component.ts';

/** Comments are not code — a comment naming a parameter must not satisfy this gate. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Parameters the recall route accepts. Two sources, because the route reads them two ways: most arrive in one
 * destructure, while the two booleans are pulled off `req.body` individually so a non-boolean can be rejected
 * rather than coerced.
 */
function routeParams() {
  const whole = stripComments(readFileSync(ROUTE, 'utf8'));

  // Bounded to the recall HANDLER. This file holds several routes, and an unbounded scan for `req.body`
  // reads pulled in `includeChrono` from the traverse handler above — a parameter recall never accepts, so
  // the gate failed on a route it was not looking at. Scope a sweep from the thing it is about.
  const start = whole.indexOf("searchRouter.post('/spaces/:spaceId/recall'");
  assert.ok(start > 0, `the recall route declaration was not found in ${ROUTE}`);
  const after = whole.indexOf('searchRouter.post(', start + 1);
  const src = whole.slice(start, after > 0 ? after : undefined);

  const destructure = /const \{([^}]*)\} = req\.body \?\? \{\};/.exec(src);
  assert.ok(destructure, `no recall destructure found in ${ROUTE}`);
  const names = new Set(destructure[1].split(',').map(s => s.trim()).filter(Boolean));

  for (const m of src.matchAll(/\(req\.body as \{\s*(\w+)\?: unknown\s*\}\)\.\1/g)) {
    names.add(m[1]);
  }

  // `space` is the path parameter, not a body field, and `query` is required rather than optional.
  assert.ok(names.has('query'), 'the parsed set does not contain `query` — the parser is reading the wrong statement');
  assert.ok(names.size >= 10, `parsed only ${names.size} recall params — the parser is stale`);
  return names;
}

describe('recall parameters reach the UI', () => {
  const params = [...routeParams()].sort();

  it('the typed client request body declares every one of them', () => {
    const src = stripComments(readFileSync(API, 'utf8'));
    const body = /recallBrain\(\s*spaceId: string,\s*body: \{([\s\S]*?)\n    \},\s*\): Observable<RecallResponse>/.exec(src);
    assert.ok(body, `recallBrain's request body type not found in ${API}`);

    const declared = new Set([...body[1].matchAll(/^\s{6}(\w+)\??:/gm)].map(m => m[1]));
    const missing = params.filter(p => !declared.has(p));
    assert.deepEqual(missing, [],
      `the recall route accepts ${missing.join(', ')} but the client body type does not declare it, so no ` +
      'component can send it — a capability that exists on the API and reaches nobody');
  });

  it('the recall panel actually sends every one of them', () => {
    const src = stripComments(readFileSync(PANEL, 'utf8'));
    const call = /recallBrain\(this\.spaceId\(\), \{([\s\S]{0,2000}?)\n    \}\)\.subscribe/.exec(src);
    assert.ok(call, `the recall submit call not found in ${PANEL}`);
    const sentBody = call[1];

    const unsent = params.filter(p => !new RegExp(`\\b${p}\\b`).test(sentBody));
    assert.deepEqual(unsent, [],
      `the recall panel never sends ${unsent.join(', ')} — declaring a parameter the form cannot set leaves ` +
      'the control missing, which is the gap this gate exists for');
  });

  it('traverse and maxTimeMS specifically — the two that were missing', () => {
    // Named outright rather than left to the derived set: these are the regression, and a parser that quietly
    // stopped finding them would let the exact original bug back in while every other assertion still passed.
    assert.ok(params.includes('traverse'), 'the route no longer accepts `traverse` — if that is deliberate, remove its control');
    assert.ok(params.includes('maxTimeMS'), 'the route no longer accepts `maxTimeMS` — if that is deliberate, remove its control');
    const panel = stripComments(readFileSync(PANEL, 'utf8'));
    for (const p of ['traverse', 'maxTimeMS']) {
      assert.match(panel, new RegExp(`recallForm\\.${p}`), `the recall form has no \`${p}\` control`);
      assert.match(panel, new RegExp(`name="recall${p[0].toUpperCase()}${p.slice(1)}"`),
        `no input is bound for \`${p}\` — the form field exists with nothing to set it`);
    }
  });
});
