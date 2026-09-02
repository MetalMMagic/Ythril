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
import { balancedFrom } from './_structural-window.mjs';
import { readFileSync } from 'node:fs';

const ROUTE = 'server/src/api/brain/search.ts';
const API = 'client/src/app/core/brain-api.service.ts';
/**
 * The files that can hold a recall CONTROL.
 *
 * Two, because `U-1` split the form out of the tab: the tab builds the request and the form holds the
 * inputs, and this gate is about the inputs. Read together rather than re-pointed at whichever file is
 * current, so the next move does not silently take the check with it — and NOT relaxed: both assertions
 * below still demand a real binding and a real name attribute.
 */
const PANELS = [
  'client/src/app/pages/brain/query-tab.component.ts',
  'client/src/app/pages/brain/recall-form.component.ts',
];

/** Comments are not code — a comment naming a parameter must not satisfy this gate. */
function stripComments(src) {
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** One route handler's source, bounded to itself. */
function handlerSource(path) {
  const whole = stripComments(readFileSync(ROUTE, 'utf8'));
  // Bounded to ONE handler. This file holds several routes, and an unbounded scan for `req.body` reads pulled
  // `includeChrono` out of the traverse handler while the gate was looking at recall — so it failed on a route
  // it was not about. Scope a sweep from the thing it is about.
  const start = whole.indexOf(`searchRouter.post('${path}'`);
  assert.ok(start > 0, `the ${path} route declaration was not found in ${ROUTE}`);
  const after = whole.indexOf('searchRouter.post(', start + 1);
  return whole.slice(start, after > 0 ? after : undefined);
}

/**
 * Parameters a route accepts. Several sources, because a handler reads them more than one way: most arrive in
 * one destructure, booleans are pulled off `req.body` individually so a non-boolean can be rejected rather
 * than coerced, and a group of related flags may be read by iterating an object of defaults.
 */
function paramsOf(path) {
  const src = handlerSource(path);

  const destructure = /const \{([^}]*)\} = req\.body \?\? \{\};/.exec(src);
  assert.ok(destructure, `no destructure found for ${path}`);
  const names = new Set(destructure[1].split(',').map(s => s.trim()).filter(Boolean));

  for (const m of src.matchAll(/\(req\.body as \{\s*(\w+)\?: unknown\s*\}\)\.\1/g)) {
    names.add(m[1]);
  }

  // The flags-with-defaults form: `const inclusions = { includeChrono: true, … }` iterated over `req.body`.
  // Without this the traverse flags would be invisible to the gate, which is the same blindness in a new shape.
  const defaults = /const \w+ = \{([^}]*)\};\s*for \(const \w+ of Object\.keys/.exec(src);
  if (defaults) {
    for (const m of defaults[1].matchAll(/(\w+):\s*(?:true|false)/g)) names.add(m[1]);
  }
  return names;
}

function routeParams() {
  const names = paramsOf('/spaces/:spaceId/recall');

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
    // The REQUEST still lives on the tab; only the controls moved. PANELS[0] rather than the pair, because
    // a window bounded by braces has to come from one file.
    const src = stripComments(readFileSync(PANELS[0], 'utf8'));
    // A WINDOW, converted: the subject is the OBJECT the call sends, bounded by its own brace. 2000
    // characters plus a hard-coded four-space `\n    })` was two guesses — how long the body is, and how deep
    // it is indented. A panel reformatted by a prettier run would have failed this on unchanged behaviour.
    const at = src.indexOf('recallBrain(this.spaceId(), {');
    assert.ok(at > -1, `the recall submit call not found in ${PANELS[0]}`);
    const sentBody = balancedFrom(src, src.indexOf('{', at), 'the recall request body');

    const unsent = params.filter(p => !new RegExp(`\\b${p}\\b`).test(sentBody));
    assert.deepEqual(unsent, [],
      `the recall panel never sends ${unsent.join(', ')} — declaring a parameter the form cannot set leaves ` +
      'the control missing, which is the gap this gate exists for');
  });

  it('the TRAVERSE route reaches the client too — same rule, the other door', () => {
    // The gate's first version found this by accident, sweeping too widely. `includeChrono` was accepted by
    // the traverse route, offered by the MCP tool, and absent from the client's typed body — the recall gap
    // exactly, one route over. The owner then asked for `includeMemories` and `includeEdges` alongside it.
    const params = [...paramsOf('/spaces/:spaceId/traverse')];
    for (const flag of ['includeChrono', 'includeMemories', 'includeFiles', 'includeEdges']) {
      assert.ok(params.includes(flag), `the traverse route no longer accepts \`${flag}\``);
    }

    const api = stripComments(readFileSync(API, 'utf8'));
    // Same conversion: the subject is the request body TYPE, bounded by its own brace.
    const bodyAt = api.indexOf('traverseGraph(spaceId: string, body: {');
    assert.ok(bodyAt > -1, `traverseGraph's request body type not found in ${API}`);
    const bodyType = balancedFrom(api, api.indexOf('{', bodyAt), 'the traverseGraph body type');
    const declared = new Set([...bodyType.matchAll(/(\w+)\??:/g)].map(m => m[1]));
    const missing = params.filter(p => !declared.has(p));
    assert.deepEqual(missing, [],
      `the traverse route accepts ${missing.join(', ')} and the client body type does not declare it`);

    // MCP is the other consumer, and its schema is `additionalProperties: false` — an undeclared flag is not
    // merely undocumented there, it is REJECTED. So the tool schema has to carry each one.
    const mcp = stripComments(readFileSync('server/src/mcp/tools/edge.ts', 'utf8'));
    for (const flag of ['includeChrono', 'includeMemories', 'includeFiles', 'includeEdges']) {
      assert.match(mcp, new RegExp(`${flag}: \\{ type: 'boolean'`),
        `the MCP traverse tool does not declare \`${flag}\`, so a caller passing it is rejected`);
    }
  });

  it('includeEdges suppresses the LIST, never the walk', () => {
    // The distinction the owner drew, and the one a future edit is most likely to collapse: edges are how the
    // graph is traversed, so gating traversal on this flag would return a different set of nodes rather than a
    // smaller payload. Checked structurally — the flag may only appear where the answer is assembled.
    const src = stripComments(readFileSync('server/src/brain/edges.ts', 'utf8'));
    const uses = [...src.matchAll(/includeEdges/g)].length;
    assert.ok(uses >= 2, 'includeEdges is not used in edges.ts');
    assert.match(src, /edges: includeEdges \? resultEdges : \[\]/,
      'the edge list must be chosen where the answer is built');
    // The traversal guards read `includeChrono`/`includeMemories`; `includeEdges` must not join them.
    assert.ok(!/if \([^)]*includeEdges[^)]*\)\s*\{/.test(src),
      'includeEdges guards a branch — it must not decide what is visited, only what is returned');
  });

  it('traverse and maxTimeMS specifically — the two that were missing', () => {
    // Named outright rather than left to the derived set: these are the regression, and a parser that quietly
    // stopped finding them would let the exact original bug back in while every other assertion still passed.
    assert.ok(params.includes('traverse'), 'the route no longer accepts `traverse` — if that is deliberate, remove its control');
    assert.ok(params.includes('maxTimeMS'), 'the route no longer accepts `maxTimeMS` — if that is deliberate, remove its control');
    const panel = PANELS.map(f => stripComments(readFileSync(f, 'utf8'))).join('\n');
    for (const p of ['traverse', 'maxTimeMS']) {
      // Matched on the BINDING rather than on one spelling of the state object. The tab called it
      // `recallForm.traverse` and the extracted form calls it `form().traverse`; a gate that pinned either
      // spelling would be a hand-kept mapping table, which is what U-1's parity gate exists to avoid.
      assert.match(panel, new RegExp(`\\[\\(ngModel\\)\\]="[^"]*\\.${p}"`),
        `nothing is two-way bound to \`${p}\` — the parameter is reachable only by hand-writing a request`);
      assert.match(panel, new RegExp(`name="recall${p[0].toUpperCase()}${p.slice(1)}"`),
        `no input is bound for \`${p}\` — the form field exists with nothing to set it`);
    }
  });
});
