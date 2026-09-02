/**
 * Every parameter `recall` accepts is one the Query panel can send.
 *
 * ## Why this gate, when a five-places enforcer already exists
 *
 * `client-bodies-match-server.test.js` checks the other direction and only the top level: that no key the
 * client sends is refused by the server. It cannot see a parameter the client never sends, and it cannot see
 * a NESTED one at all — which is not theoretical. The three `traverse.include*` flags arrived with A-2, the
 * panel has no control for any of them, and nothing fired, because they live inside an object.
 *
 * The owner's instruction is the requirement this enforces, 2026-08-30: *"one input field for EACH AND EVERY
 * available option a recall has. I want to be able to do everything there that a mcp call can do. FULL
 * CAPABILITIES."*
 *
 * ## The parameter list is DERIVED, never transcribed
 *
 * From the `recall` tool's own `inputSchema`, which is the authoritative surface — the same object an MCP
 * caller reads while constructing arguments. A hand-kept list of expected parameters is what produced the gap
 * in the first place: it passes whenever the list and the panel are wrong the same way, and it goes stale
 * silently the day a parameter is added.
 *
 * The count this replaces was measured by hand at "14 of ~28", and the tilde was doing real work. The real
 * number is below, computed, and it turned out the hand list named four parameters `recall` does not have
 * (`sort`, `dir`, `entryId`, `entryType` belong to `/query` and `find-similar`).
 *
 * ## And it reads the REQUEST, not the form
 *
 * What matters is whether the panel can express a parameter, not what its control is called. The form field
 * for traversal depth is `recallForm.traverse` and sends the API's `traverse` as a number; asserting on
 * control names would need a hand-kept mapping table, which is the very shape this gate exists to avoid.
 * So it parses the object literal handed to `recallBrain(...)` and asks which keys can appear in it.
 *
 * Run: node --test testing/standalone/query-panel-offers-every-recall-parameter.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { ALL_TOOLS } = await import('../../server/dist/mcp/tools/index.js');

const PANEL = 'client/src/app/pages/brain/query-tab.component.ts';

/** What `inputSchema(s)` is given at runtime — only the two space shapes are read out of it. */
const STUB = { requiredSpace: { type: 'string' }, optionalSpace: { type: 'string' } };

/**
 * Parameters the panel is not expected to offer, each with the reason.
 *
 * **An entry here is U-1's remaining scope, stated where a machine can check it.** The same arrangement as
 * `NO_CONTROL` in `type-schema-editable.test.js`, which is what made `G-12` findable and what `G-12` then
 * emptied: a row is a promise that something is deliberately absent, and the checks below refuse a row that
 * names a parameter `recall` no longer has.
 *
 * The reasons split into two kinds, and the difference is the point:
 *
 * - **`space` is permanently exempt.** The panel is opened ON a space; a selector would let an operator run
 *   a recall against a space the page is not showing and then render the results under this space's name.
 * - **Everything else is NOT YET.** Those rows go when U-1's second and third changes land, and the layout
 *   rework comes first because it is what makes room for them.
 */
const NO_CONTROL = {
  space: 'PERMANENT. The panel is opened on a space and takes it from the page. A selector here would let a '
    + 'recall run against another space and render its results under this one\'s name — the fabricated-context '
    + 'defect, not a missing feature.',

  projection: 'NOT YET (U-1). Field selection needs a control that knows the record shapes, and it is the one '
    + 'parameter whose wrong setting silently removes the field an operator is looking at.',
  maxChars: 'NOT YET (U-1). The panel binds maxBytes only, so the two budget units are half-exposed — the same '
    + 'split that made B-1 a bug on the API side.',
  maxTokens: 'NOT YET (U-1). Belongs beside maxChars and charsPerToken as one response-envelope group rather '
    + 'than as three separate numbers.',
  charsPerToken: 'NOT YET (U-1). Only meaningful with maxTokens, so it ships with it or it is a number with no '
    + 'stated effect.',
  skip: 'NOT YET (U-1). Paging the panel needs the response to carry nextSkip through to a control, which is a '
    + 'results-side change and not a form field.',
  remainderDump: 'NOT YET (U-1). It WRITES A FILE into the space, so the control has to say so before it is '
    + 'offered as a checkbox beside the read-only ones.',

  'traverse.depth': 'NOT YET (U-1). The panel sends traverse as a NUMBER, which is the depth — so the value is '
    + 'reachable and the object form is not, and the five other traversal parameters are unreachable with it.',
  'traverse.edgeLabels': 'NOT YET (U-1). Needs traverse sent as an OBJECT first — a label allowlist for the '
    + 'walk, and one of the four traversal controls the row was filed for.',
  'traverse.direction': 'NOT YET (U-1). Needs traverse sent as an OBJECT first. It narrows the walk to '
    + 'inbound or outbound edges, which is the difference between who reports to whom.',
  'traverse.includeChrono': 'NOT YET (U-1). Arrived with A-2 inside the traverse object, which is why the '
    + 'top-level five-places enforcer did not fire and this gate exists.',
  'traverse.includeMemories': 'NOT YET (U-1). Arrived with includeChrono and is unreachable for the same '
    + 'reason: the panel sends traverse as a number, so the object form is not expressible.',
  'traverse.includeFiles': 'NOT YET (U-1). Arrived with includeChrono and is unreachable for the same '
    + 'reason: the panel sends traverse as a number, so the object form is not expressible.',
};

/** Comments stripped: a docblock listing parameter names would answer for controls that do not exist. */
const strip = s => s.replace(/^[ \t]*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every parameter `recall` accepts, as flat names — nested ones dotted.
 *
 * `traverse` is a `oneOf` of a number and an object, so the object branch's properties are real parameters
 * that a caller can send and are invisible to any check that stops at the top level.
 */
function recallParameters() {
  const tool = ALL_TOOLS.find(t => t.name === 'recall');
  assert.ok(tool?.inputSchema, 'the recall tool is gone or renamed — re-anchor this gate');
  const props = tool.inputSchema(STUB).properties ?? {};
  const out = [];
  for (const [name, spec] of Object.entries(props)) {
    out.push(name);
    const branches = spec.oneOf ?? (spec.type === 'object' ? [spec] : []);
    for (const b of branches) {
      for (const leaf of Object.keys(b.properties ?? {})) out.push(`${name}.${leaf}`);
    }
  }
  return out;
}

/** From the `{` at `open`, the matching `}` — inclusive. */
function literalAt(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error('unbalanced braces in the recall body literal');
}

/**
 * The keys the panel's recall request can carry.
 *
 * Both spellings count, because the body is built with conditional spreads: `topK: …` and `...(types ? {
 * types } : {})` are the same capability written two ways, and a check that saw only one of them would
 * report a missing control for a parameter that is bound.
 */
function panelRequestKeys() {
  const src = strip(readFileSync(PANEL, 'utf8'));
  const call = src.indexOf('recallBrain(');
  assert.ok(call > 0, `no recallBrain( call in ${PANEL} — the panel was renamed or moved`);
  const body = literalAt(src, src.indexOf('{', src.indexOf(',', call)));
  const keys = new Set();
  for (const m of body.matchAll(/[{,]\s*([a-zA-Z][\w]*)\s*[:}]/g)) keys.add(m[1]);
  return keys;
}

describe('the Query panel can send every recall parameter', () => {
  it('read the schema and the panel — both anchors still hold', () => {
    // Floors everything below. A renamed tool or a moved call site would make every check pass over nothing,
    // which is the failure mode this repo has paid for more than once.
    const params = recallParameters();
    assert.ok(params.length >= 20, `only found ${params.length} recall parameters: ${params.join(', ')}`);
    for (const expected of ['query', 'topK', 'traverse', 'traverse.depth', 'traverse.includeChrono']) {
      assert.ok(params.includes(expected), `expected ${expected} among ${params.join(', ')}`);
    }

    const keys = panelRequestKeys();
    assert.ok(keys.size >= 10, `only ${keys.size} keys parsed out of the panel's recall body`);
    for (const expected of ['query', 'topK', 'minScore', 'traverse']) {
      assert.ok(keys.has(expected), `expected the panel to send ${expected}; parsed: ${[...keys].join(', ')}`);
    }
  });

  it('every parameter has a control, or a row saying why not', () => {
    const keys = panelRequestKeys();
    const missing = recallParameters()
      .filter(p => !(p in NO_CONTROL))
      .filter(p => !keys.has(p.includes('.') ? p.split('.')[1] : p));

    assert.deepEqual(missing, [], 'these parameters are accepted by `recall` and the Query panel cannot send '
      + `them, so an operator cannot do from the UI what an MCP caller can do:\n  ${missing.join('\n  ')}\n\n`
      + 'Add a control and send the key from runRecall(), or add it to NO_CONTROL with the reason.');
  });

  it('every exemption still names a real parameter, so the list cannot rot', () => {
    const params = recallParameters();
    for (const [p, reason] of Object.entries(NO_CONTROL)) {
      assert.ok(params.includes(p), `NO_CONTROL lists ${p}, which recall no longer accepts — drop the entry`);
      assert.ok(reason.length > 40, `${p}'s exemption needs a reason, not a placeholder`);
    }
  });

  it('and a NOT YET row is answered by an open task', () => {
    // The lesson `no-new-god-files` wrote down: an exemption with a good reason and no follow-up is how a gap
    // becomes permanent one defensible row at a time. `space` is the exception and says PERMANENT.
    const unanswered = Object.entries(NO_CONTROL)
      .filter(([, r]) => !r.startsWith('PERMANENT'))
      .filter(([, r]) => !/\bU-\d+\b/.test(r))
      .map(([p]) => p);
    assert.deepEqual(unanswered, [], 'these exemptions name neither a task nor PERMANENT, so nothing is '
      + `queued to close them:\n  ${unanswered.join('\n  ')}`);
  });
});
