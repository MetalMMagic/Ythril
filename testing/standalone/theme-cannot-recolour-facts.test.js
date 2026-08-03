/**
 * A theme owns identity. It must not own facts — and the docs have to say so, because nothing else can stop it.
 *
 * ## The finding — UX audit lens
 *
 * An operator running a **red** brand palette on 2.2.5 sent a screenshot of an "Active" pill rendered in red. In the
 * v2.2.5 tag, `.pill.active` reads:
 *
 *     color: var(--accent);  background: rgba(206,255,128,.12);  border-color: rgba(206,255,128,.28);
 *
 * Red text from the themed brand token, greenish background from a hardcoded rgba of the *default* green — which is
 * exactly what the screenshot shows. `--state-active` did not exist in that tag at all.
 *
 * **#637 already fixed the code**: `.pill.active` now reads `--state-active`, and a sweep at the time found two more
 * elements doing the same thing. It simply is not released yet — 2.2.5 predates it.
 *
 * ## So what was actually left to do
 *
 * The residual risk is not in the CSS, it is in the theme SURFACE. Both theming paths — the injected `cssUrl`
 * stylesheet and the `postMessage` token channel — accept **any** `--` custom property, so an embedder can set
 * `--error`, `--success` or `--state-active` directly. No code can prevent that; the only defence is telling the
 * operator which tokens report facts. The rule existed in a CSS comment and nowhere an operator would read.
 *
 * ## What this gate holds
 *
 * That every semantic state token declared in `:root` is named in the theme documentation's do-not-override list. Add
 * a new one and the docs must mention it, or a future palette recolours a fact and nothing warns anybody.
 *
 * It deliberately does NOT assert `--state-active`'s value. Keeping it byte-identical to the default accent is a
 * choice from #637 — an unthemed instance stays pixel-identical, and only a themed one changes.
 *
 * Run: node --test testing/standalone/theme-cannot-recolour-facts.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(join('client', 'src', 'styles.scss'), 'utf8');
const DOC = readFileSync(join('docs', 'integration-guide', '15-about-and-embedding.md'), 'utf8');

/** The five tokens that report what the system IS. Derived tokens mix from these. */
const FACT_TOKENS = ['--state-active', '--success', '--warning', '--error', '--info'];

describe('the semantic tokens exist and are grouped as such', () => {
  it('all five are declared', () => {
    for (const t of FACT_TOKENS) {
      assert.match(CSS, new RegExp(`${t}:\\s*#[0-9a-fA-F]{3,6}`), `${t} is missing or no longer a literal colour`);
    }
  });

  it('the block still explains the rule at the point of declaration', () => {
    // The comment is what stops the next person "tidying up" by pointing a pill at --accent again.
    const at = CSS.indexOf('--state-active:');
    const around = CSS.slice(Math.max(0, at - 1400), at);
    assert.match(around, /theme/i, 'the declaration should carry the identity-vs-facts note');
    assert.match(around, /SEMANTIC STATE NEVER DOES|must not move|does not own facts/i,
      'the rule must be stated where the tokens are declared');
  });
});

describe('no fact-reporting element reads the brand token', () => {
  it('the pill variants use semantic tokens, not --accent', () => {
    // The regression #637 fixed, pinned. `.pill.active` read `var(--accent)` in v2.2.5, which is why a red brand
    // palette turned "Active" red while "Healthy" stayed green.
    const pill = readFileSync(join('client', 'src', 'app', 'shared', 'status-pill.component.ts'), 'utf8');
    const at = pill.indexOf('.pill.active');
    assert.ok(at > 0, 'the active pill variant is gone — re-anchor this gate');
    const rule = pill.slice(at, pill.indexOf('}', at));
    assert.match(rule, /var\(--state-active\)/, 'the active pill must read --state-active');
    assert.doesNotMatch(rule, /var\(--accent\)/, 'a pill reports a fact; it must never follow the brand colour');
    assert.doesNotMatch(rule, /rgba\(206,\s*255,\s*128/,
      'the background must mix from the same token, not hardcode the default green — that mismatch is what produced '
      + 'red text on a green pill');
  });
});

describe('the theme surface documents what it must not touch', () => {
  it('there is a section saying a theme does not own facts', () => {
    const at = DOC.indexOf('What a theme owns');
    assert.ok(at > 0, 'the theme docs no longer say which tokens are off limits — and nothing in the browser can '
      + 'stop an embedder from setting them');
    const section = DOC.slice(at, DOC.indexOf('\n### ', at + 10));
    assert.match(section, /does not own facts|must not/i, 'the rule must be stated plainly');
    return section;
  });

  it('every fact token is named in that section', () => {
    // The point of the gate: adding a sixth semantic token without documenting it would leave a fact a theme can
    // recolour with nothing to warn the operator.
    const at = DOC.indexOf('What a theme owns');
    const section = DOC.slice(at, DOC.indexOf('\n### ', at + 10));
    const missing = FACT_TOKENS.filter(t => !section.includes(t));
    assert.deepEqual(missing, [], 'these report facts but the theme docs do not list them as off limits:\n  '
      + missing.join('\n  '));
  });

  it('it says which tokens ARE the theme\'s, so the guidance is usable', () => {
    // A list of prohibitions with no permissions reads as "do not theme", which nobody will follow.
    const at = DOC.indexOf('What a theme owns');
    const section = DOC.slice(at, DOC.indexOf('\n### ', at + 10));
    assert.match(section, /--accent/, 'it must say the brand tokens are the operator\'s');
    assert.match(section, /you are here|navigation/i,
      'it must explain the line: a selected tab follows the accent, a status pill does not');
  });

  it('it gives the concrete failure, not just a rule', () => {
    const at = DOC.indexOf('What a theme owns');
    const section = DOC.slice(at, DOC.indexOf('\n### ', at + 10));
    assert.match(section, /red/i,
      'the example is what makes the rule land: "Active" and "Online" rendered red while "Healthy" stayed green');
  });
});
