/**
 * Every text colour in the shipped palette clears WCAG AA against every surface it sits on — computed, not judged.
 *
 * ## The finding — Accessibility & Internationalization audit lens
 *
 * The lens asks for "color contrast in both themes". There is one theme: the product is dark-only, with no
 * `[data-theme]` and no `prefers-color-scheme` block, so "both themes" collapses to one — and the ratios for that
 * one had apparently never been computed.
 *
 * They are now, and one token failed:
 *
 * | token | on bg-primary | on bg-surface | on bg-elevated |
 * |---|---|---|---|
 * | `--text-primary` #e6edf3 | 16.02 | 14.64 | 13.70 |
 * | `--text-secondary` #8b949e | 6.15 | 5.62 | 5.26 |
 * | **`--text-muted` #6e7681** | **4.12** | **3.77** | **3.52** |
 *
 * AA for normal text is **4.5:1**. `--text-muted` cleared only the large-text threshold (3:1) — while being used at
 * **11px** for field labels, timestamps and retention notes, where the large-text exemption cannot apply. That is not
 * a borderline reading: 3.52:1 on the surface it is most often drawn on.
 *
 * Both greys were lifted (`#848c97`, `#9ba4ae`) so the three-level hierarchy survives — the luminance gap between
 * secondary and muted is 10.7 points against 11.3 before, and `--text-primary` is untouched. Checked on a rendered
 * before/after image as well as in numbers, because a colour change is a visual change.
 *
 * ## Why this is a test and not a note
 *
 * A ratio is arithmetic. Left as a comment it drifts the first time somebody nudges a grey to look better on their
 * monitor; computed here, it cannot. The semantic colours are included because status text is exactly where a
 * too-dim colour does the most harm.
 *
 * Run: node --test testing/standalone/text-contrast-meets-aa.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(join('client', 'src', 'styles.scss'), 'utf8');

/** Literal hex custom properties declared in `:root`. Aliases (`var(--x)`) are skipped by the pattern. */
const TOKENS = (() => {
  const at = CSS.indexOf(':root {');
  assert.ok(at >= 0, 'the :root token block is gone');
  const block = CSS.slice(at, CSS.indexOf('\n}', at));
  const out = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) out[m[1]] = m[2];
  return out;
})();

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4]
    .map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio. */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = ['bg-primary', 'bg-surface', 'bg-elevated'];
const TEXT = ['text-primary', 'text-secondary', 'text-muted'];
const AA = 4.5;

describe('the computation itself, before it is trusted', () => {
  it('found the tokens', () => {
    // A rename would otherwise reduce every sweep below to nothing and pass by examining nothing.
    assert.ok(Object.keys(TOKENS).length >= 20, `expected the palette, found ${Object.keys(TOKENS).length} tokens`);
    for (const t of [...TEXT, ...SURFACES]) {
      assert.match(TOKENS[t] ?? '', /^#[0-9a-fA-F]{3,6}$/, `${t} is missing or not a literal colour`);
    }
  });

  it('agrees with the WCAG reference values', () => {
    // Black on white is exactly 21:1 and a colour against itself is exactly 1:1. If these drift, every number
    // below is meaningless — this is the arithmetic's own smoke test.
    assert.equal(Math.round(contrast('#000000', '#ffffff') * 100) / 100, 21);
    assert.equal(Math.round(contrast('#123456', '#123456') * 100) / 100, 1);
    // A published sample: #767676 on white is the canonical "just passes AA" grey, 4.54:1.
    assert.ok(Math.abs(contrast('#767676', '#ffffff') - 4.54) < 0.02,
      `#767676 on white should be ~4.54:1, computed ${contrast('#767676', '#ffffff').toFixed(2)}`);
  });
});

describe('every text token clears AA on every surface', () => {
  it('normal-size text is at least 4.5:1', () => {
    const fails = [];
    for (const t of TEXT) {
      for (const s of SURFACES) {
        const r = contrast(TOKENS[t], TOKENS[s]);
        if (r < AA) fails.push(`--${t} ${TOKENS[t]} on --${s} ${TOKENS[s]}: ${r.toFixed(2)}:1`);
      }
    }
    assert.deepEqual(fails, [], 'these are below WCAG AA for normal text (4.5:1). --text-muted is used at 11px for '
      + 'field labels and timestamps, so the 3:1 large-text threshold does not apply to it:\n  ' + fails.join('\n  '));
  });

  it('the semantic colours clear AA too', () => {
    // Status text is where a dim colour costs the most: an error nobody can read is worse than no error.
    const fails = [];
    for (const name of ['error', 'warning', 'success', 'accent']) {
      if (!TOKENS[name]) continue;
      const r = contrast(TOKENS[name], TOKENS['bg-primary']);
      if (r < AA) fails.push(`--${name} ${TOKENS[name]}: ${r.toFixed(2)}:1`);
    }
    assert.deepEqual(fails, [], `below AA against bg-primary:\n  ${fails.join('\n  ')}`);
  });

  it('the three levels stay visually distinct', () => {
    // The cheap way to satisfy the assertion above would be to make every grey the same near-white, which passes
    // arithmetic and destroys the hierarchy. Ordering plus a real gap is what keeps the fix honest.
    const [p, s, m] = TEXT.map(t => luminance(TOKENS[t]) * 100);
    assert.ok(p > s && s > m, `primary > secondary > muted must hold: ${p.toFixed(1)} / ${s.toFixed(1)} / ${m.toFixed(1)}`);
    assert.ok(s - m >= 6,
      `secondary and muted are ${(s - m).toFixed(1)} luminance points apart; below ~6 they read as one colour`);
    assert.ok(p - s >= 20, `primary and secondary are only ${(p - s).toFixed(1)} points apart`);
  });
});

describe('there is one theme, which is why "both themes" is not checked', () => {
  it('no second palette exists', () => {
    // If a light theme is ever added, this test should FAIL so the ratios get computed for it too, rather than
    // silently checking half the product.
    assert.doesNotMatch(CSS, /\[data-theme\s*=\s*["']light["']\]/,
      'a light theme appeared — extend this gate to compute its ratios before shipping it');
    assert.doesNotMatch(CSS, /@media\s*\(prefers-color-scheme:\s*light\)/,
      'a light-scheme block appeared — extend this gate to cover it');
  });
});
