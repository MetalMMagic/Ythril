/**
 * A type control must offer the types the SERVER will accept.
 *
 * ## The bug underneath the bug
 *
 * The owner reported a wording problem: the chrono type filter was labelled "kind" and its dropdown listed
 * standard values instead of schema-derived ones. The label was real. What sat under it was worse.
 *
 * `getAllowedChronoTypes` (server/src/spaces/schema-validation.ts) is **exclusive**:
 *
 *     const customTypes = meta?.typeSchemas?.chrono;
 *     if (customTypes && Object.keys(customTypes).length > 0) return new Set(Object.keys(customTypes));
 *     return new Set(['event', 'deadline', 'plan', 'prediction', 'milestone']);
 *
 * A space that declares its own chrono types allows those and ONLY those — the five built-ins are refused.
 * That gate is on the REST create route, the REST update route, sync, bulk and MCP: five call sites.
 *
 * The client had **no copy of that rule**. Every chrono select — create form, inline edit, drawer — bound the
 * hardcoded `store.chronoKinds`. So in a space with declared chrono types, every option the dropdown offered
 * was a value the API answers `type must be one of: …` to, and the type the space actually required was not
 * offered anywhere. The create form could not create. The form also *opened* on `'event'`, arming the
 * rejected value before the user touched anything.
 *
 * There was a free-text "custom" escape hatch beside the presets, carrying the comment "the server accepts
 * free-text values beyond the predefined enum". True when written, false once the allowlist landed — the
 * allowlist arrived later (see chrono-type-allowlist.test.js, "the gap this closes") and nobody came back for
 * the client. So the escape hatch could only ever produce a 400, which is why it is gone rather than fixed.
 *
 * ## What this gate checks, and why by shape
 *
 * Two halves, because either alone passes on the broken code:
 *
 * 1. No `<select>` in the brain UI may draw its options from a bare property. An option list that is a
 *    property rather than a call is a static array by construction — the defect itself. Calls are allowed
 *    because a call can consult `spaceMeta()`. Closed enums that are genuinely not schema-extensible
 *    (chrono lifecycle status) are named exemptions, and the exemption list is asserted to be USED, so a
 *    stale exemption cannot sit here quietly granting cover to a future static list.
 *
 * 2. The client's mirror must still agree with the server's rule: `chronoAllowedTypes` has to REPLACE the
 *    built-ins on a declared schema, not union with them. The union version is the tempting fix — it makes
 *    the schema types appear, which is what the report asked for, while still offering five values that 400.
 *
 * Mutation-tested against the pre-fix code: restoring `store.chronoKinds` in any of the three selects fails
 * half 1, and rewriting the mirror as `[...chronoKinds, ...declared]` fails half 2.
 *
 * Run: node --test testing/standalone/schema-derived-type-controls.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BRAIN_DIR = 'client/src/app/pages/brain';

/** Tracked files only — a gitignored scratch component is not part of the product. */
function trackedComponents() {
  return execFileSync('git', ['ls-files', BRAIN_DIR], { encoding: 'utf8' })
    .split('\n')
    .map(l => l.trim())
    .filter(f => f.endsWith('.component.ts'));
}

/** Comments are not code: a comment that names `store.chronoKinds` must not fail this gate, and the
 *  comment explaining the fix is exactly the text that would. */
function stripComments(src) {
  return src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Option lists that are legitimately static: a closed enum the space schema cannot extend. Each entry must
 * be matched by something real, so this list cannot rot into a blanket permission.
 */
const CLOSED_ENUMS = [
  // Chrono lifecycle statuses. Not schema-driven on the server either — validated against a fixed union.
  'store.chronoStatusOptions',
  // The five record collections. A space declares TYPES within a collection; it cannot add a collection,
  // and the TS union `QueryCollection` is the same fixed set.
  'queryCollections',
];

/** Every `@for (x of EXPR; track …)` that sits inside a `<select>` element. */
function selectOptionSources(src) {
  const out = [];
  // A select's options live between its open tag and its close tag; `[\s\S]{0,1600}?` is bounded so a
  // runaway match cannot swallow the next select, and `[^>]*` is never used across a `>` boundary.
  const selects = src.matchAll(/<select\b[\s\S]{0,2400}?<\/select>/g);
  for (const sel of selects) {
    for (const m of sel[0].matchAll(/@for\s*\(\s*\w+\s+of\s+([^;]+);\s*track/g)) {
      out.push(m[1].trim());
    }
  }
  return out;
}

describe('a brain type control offers server-accepted values, not a hardcoded list', () => {
  it('no <select> draws its options from a bare property', () => {
    const offenders = [];
    const exemptionsUsed = new Set();

    for (const file of trackedComponents()) {
      const src = stripComments(readFileSync(file, 'utf8'));
      for (const expr of selectOptionSources(src)) {
        if (CLOSED_ENUMS.includes(expr)) { exemptionsUsed.add(expr); continue; }
        // A call can consult the space schema; a bare property cannot. Signals and function calls both
        // end in `()`, and either is free to read `spaceMeta()`.
        if (!expr.endsWith(')')) offenders.push(`${file}: @for (… of ${expr})`);
      }
    }

    assert.deepEqual(offenders, [],
      'these option lists are static arrays — bind an accessor that consults the space schema instead:\n  ' +
      offenders.join('\n  '));

    // The gate must be looking at real selects, or it passes by finding nothing.
    assert.ok(exemptionsUsed.size > 0, 'no closed-enum select was found — the <select> scan is not matching');
    for (const exempt of CLOSED_ENUMS) {
      assert.ok(exemptionsUsed.has(exempt), `stale exemption \`${exempt}\` — nothing binds it; delete the entry`);
    }
  });

  it('the chrono select list is schema-derived on at least three surfaces', () => {
    // create form, inline edit, drawer. If a refactor drops one, the count catches it.
    const files = ['chrono-tab.component.ts', 'record-drawer.component.ts'];
    let bound = 0;
    for (const f of files) {
      const src = stripComments(readFileSync(`${BRAIN_DIR}/${f}`, 'utf8'));
      bound += [...src.matchAll(/store\.chrono(AllowedTypes|TypeOptions)\(\)/g)].length;
      assert.ok(!/@for\s*\(\s*\w+\s+of\s+store\.chronoKinds\s*;/.test(src),
        `${f} binds the built-in fallback \`store.chronoKinds\` in a template — a space that declares ` +
        '`typeSchemas.chrono` does not allow those values');
    }
    assert.ok(bound >= 3, `expected the chrono type accessors on 3+ surfaces, found ${bound}`);
  });

  it('the client mirror REPLACES the built-ins on a declared schema — it does not union with them', () => {
    const src = stripComments(readFileSync(`${BRAIN_DIR}/brain-store.service.ts`, 'utf8'));
    const fn = /chronoAllowedTypes\(\)\s*:\s*string\[\]\s*\{([\s\S]{0,600}?)\n  \}/.exec(src);
    assert.ok(fn, 'chronoAllowedTypes() not found in brain-store.service.ts');
    const body = fn[1];

    assert.match(body, /typeSchemas\?\.chrono/, 'the mirror must read the space\'s declared chrono types');

    // The union bug offers the declared types AND the five rejected ones. Distinguishing it from the correct
    // code needs the ternary's two branches read SEPARATELY: both mention `chronoKinds` and `declared`
    // somewhere in the body, so any proximity match between the two names passes on the bug and fails on the
    // fix. Optional chaining is stripped first — `?.` would otherwise split the ternary in the wrong place.
    const ret = /return ([^;]+);/.exec(body.replace(/\?\./g, '.'));
    assert.ok(ret, 'chronoAllowedTypes() has no single return expression to check');
    const ternary = /^([\s\S]*?)\?([\s\S]*?):([\s\S]*)$/.exec(ret[1]);
    assert.ok(ternary, 'the mirror must branch on whether the space declared any chrono types');
    const [, condition, whenDeclared, fallback] = ternary;

    assert.match(condition, /length\s*>\s*0/, 'the branch must test whether any chrono type was declared');
    assert.ok(!/chronoKinds/.test(whenDeclared),
      'chronoAllowedTypes() offers the built-ins in the DECLARED branch. The server rule is exclusive: when a ' +
      'space declares `typeSchemas.chrono`, the built-ins are REFUSED, so offering them there dresses five ' +
      'guaranteed 400s as valid choices.');
    assert.match(fallback, /chronoKinds/,
      'the fallback branch must offer the five built-ins — that is what the server falls back to');
  });

  it('the server rule this mirrors is still exclusive — if it changes, come back here', () => {
    const src = stripComments(readFileSync('server/src/spaces/schema-validation.ts', 'utf8'));
    const fn = /export function getAllowedChronoTypes\([\s\S]{0,400}?\n\}/.exec(src);
    assert.ok(fn, 'getAllowedChronoTypes not found — the client mirror has lost its subject');
    // Two returns, one per branch, and the declared branch returns ONLY the declared keys.
    assert.match(fn[0], /return new Set\(Object\.keys\(customTypes\)\)/,
      'the declared branch no longer returns exactly the declared keys — re-check chronoAllowedTypes()');
  });
});
