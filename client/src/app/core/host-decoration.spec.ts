/**
 * The host's decoration is worn when offered, and an undecorated theme is untouched.
 *
 * ## What is being protected
 *
 * The canary operator's portal declares eleven decoration inks on `:root`, and **their absence is the signal** to
 * render flat. Owner ruled A on 2026-08-19 (was P-11): take the CSS.
 *
 * The half that can hurt somebody is the undecorated one. Every Ythril instance that is not inside their portal
 * must render exactly as it did — so this checks the flat path FIRST, and it checks it structurally rather than by
 * looking: the decorated declarations live under `:root.ythril-decorated`, so with no class there is nothing extra
 * to compute and nothing extra to composite. "Looks the same" would be a weaker claim than "is the same rules".
 *
 * ## Why a class at all
 *
 * CSS has no portable way to ask whether a custom property is set. `var(--tr-hot, fallback)` substitutes a value
 * but cannot switch a rule off, and the decoration is not a colour swap — it is a translucent fill, a lit hairline
 * and a cast shadow, declarations that must not exist on a plain theme. So presence is resolved once at startup and
 * published as a class.
 *
 * Run: npm run test:client
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyHostDecoration, hostSuppliesDecoration, inkIsSet, DECORATED_CLASS } from './host-decoration';

const styles = readFileSync('src/styles.scss', 'utf8');
const dialog = readFileSync('src/app/pages/settings/dialog.styles.ts', 'utf8');
const main = readFileSync('src/main.ts', 'utf8');

describe('detecting whether the host decorates', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });
  afterEach(() => root.remove());

  it('no ink means NOT decorated — the default every ordinary instance gets', () => {
    expect(hostSuppliesDecoration(root)).toBe(false);
    expect(applyHostDecoration(root)).toBe(false);
    expect(root.classList.contains(DECORATED_CLASS)).toBe(false);
  });

  it('an ink means decorated', () => {
    root.style.setProperty('--tr-hot', '#ff5500');
    expect(hostSuppliesDecoration(root)).toBe(true);
    expect(applyHostDecoration(root)).toBe(true);
    expect(root.classList.contains(DECORATED_CLASS)).toBe(true);
  });

  it('the ink RULE itself: only a non-blank string is a choice', () => {
    /*
     * Asserted on the pure predicate, not through the DOM, because the DOM cannot reach it: jsdom normalises a
     * whitespace value on the way into `style.setProperty`, so the browser-level test below passes whether or not
     * the trim exists. Mutation testing removed the trim and nothing failed — which is the difference between a
     * rule that is tested and a rule that merely has a test near it.
     */
    expect(inkIsSet('#ff5500')).toBe(true);
    expect(inkIsSet('')).toBe(false);
    expect(inkIsSet('   ')).toBe(false);
    expect(inkIsSet(' \t ')).toBe(false);
    // A stub or a partial implementation can return neither, and decoration appearing from a MISSING value would
    // be the worst version of this feature.
    expect(inkIsSet(null)).toBe(false);
    expect(inkIsSet(undefined)).toBe(false);
  });

  it('a declared-but-EMPTY ink is not decoration', () => {
    /*
     * The same trap the env pins have: something present but blank is not a choice. An empty or whitespace value
     * would otherwise be truthy and turn every fallback into a colour of nothing — a card with a transparent
     * border on a theme that never asked for decoration.
     */
    root.style.setProperty('--tr-hot', '');
    expect(hostSuppliesDecoration(root)).toBe(false);
    root.style.setProperty('--tr-hot', '   ');
    expect(hostSuppliesDecoration(root)).toBe(false);
  });

  it('REMOVES the class when the ink goes away, rather than latching', () => {
    // A caller running it twice, or a host swapping stylesheets, must get the truth and not a one-way door.
    root.style.setProperty('--tr-hot', '#ff5500');
    expect(applyHostDecoration(root)).toBe(true);
    root.style.removeProperty('--tr-hot');
    expect(applyHostDecoration(root)).toBe(false);
    expect(root.classList.contains(DECORATED_CLASS)).toBe(false);
  });

  it('is idempotent, so the class appears once', () => {
    root.style.setProperty('--tr-hot', '#ff5500');
    applyHostDecoration(root);
    applyHostDecoration(root);
    expect(root.className.split(/\s+/).filter(c => c === DECORATED_CLASS)).toHaveLength(1);
  });

  it('a detached element does not throw — undecorated is the safe answer', () => {
    // Undecorated is what ships today, so an environment that cannot answer must get today's rendering.
    expect(() => hostSuppliesDecoration(document.createElement('div'))).not.toThrow();
  });
});

describe('the undecorated path is UNCHANGED, which is the half that can hurt anybody', () => {
  it('every INK reference is behind the class', () => {
    /*
     * Structural, not visual. If a decorated property leaked into a base rule, an instance outside their portal
     * would silently change appearance — and the fallback chain would hide it from a screenshot, because
     * `var(--tr-mid, var(--border))` renders identically while adding a resolution step and a composited shadow.
     *
     * Scoped to the INKS rather than to `color-mix`, and that distinction is the first version's bug: this
     * stylesheet already used `color-mix` twenty times for its own semantic tokens, so asserting on it matched a
     * pre-existing line at the top of the file and called the gate missing. Assert on what only decoration uses.
     */
    for (const [file, src] of [['styles.scss', styles], ['dialog.styles.ts', dialog]] as const) {
      const inks = [...src.matchAll(/--(?:tr-|via-|electron|glow|decor-strength)[\w-]*/g)];
      expect(inks.length, `no host inks referenced in ${file}`).toBeGreaterThan(0);
      for (const m of inks) {
        const gate = src.lastIndexOf(DECORATED_CLASS, m.index);
        expect(gate, `${m[0]} in ${file} is not inside a .${DECORATED_CLASS} block`).toBeGreaterThan(-1);
      }
    }
  });

  it('the base .card, .modal and .dialog rules still say exactly what they said', () => {
    // The three surfaces the measurement counted. If one of them changed, the flat rendering changed.
    expect(styles).toMatch(/\.card \{\s*\n\s*background: var\(--bg-surface\);\s*\n\s*border: 1px solid var\(--border\);/);
    expect(styles).toMatch(/\.modal \{\s*\n\s*background: var\(--bg-surface\);\s*\n\s*border: 1px solid var\(--border\);/);
    expect(dialog).toMatch(/\.dialog \{\s*\n\s*background: var\(--bg-primary\);\s*\n\s*border: 1px solid var\(--border\);/);
  });

  it('exactly THREE surfaces are decorated — the number the decision was made on', () => {
    /*
     * The integrator asked whether a card surface is defined in one place or forty, and said forty would mean no.
     * It is three. A fourth appearing here means the answer that decision rested on has changed, and it should be
     * re-examined rather than extended by habit.
     */
    /*
     * Read from the decorated block's SELECTOR LIST only — the text between its opening brace and the first
     * declaration's brace. The first version scraped the whole block and picked up the class name and a file
     * extension, which is the same magic-window mistake that cost this session three false failures elsewhere:
     * bound a window by STRUCTURE, never by a count or a convenient nearby character.
     */
    const opener = `:root.${DECORATED_CLASS} {`;
    const start = styles.indexOf(opener);
    expect(start, 'the decorated block is gone — re-anchor this spec').toBeGreaterThan(-1);
    const inner = styles.slice(start + opener.length);
    const selectorList = inner.slice(0, inner.indexOf('{'));
    const surfaces = [...selectorList.matchAll(/\.([a-z][\w-]*)/g)].map(m => m[1]).sort();
    expect(surfaces).toEqual(['card', 'modal']);
    expect(dialog).toContain(`:root.${DECORATED_CLASS} .dialog`);
  });
});

describe('it runs before the first paint', () => {
  it('applied in main.ts ahead of bootstrapApplication', () => {
    // After bootstrap, a card would be seen flat for a frame and then decorate — a visible flash on every load.
    const apply = main.indexOf('applyHostDecoration()');
    const boot = main.indexOf('bootstrapApplication(');
    expect(apply).toBeGreaterThan(-1);
    expect(boot).toBeGreaterThan(-1);
    expect(apply).toBeLessThan(boot);
  });
});
