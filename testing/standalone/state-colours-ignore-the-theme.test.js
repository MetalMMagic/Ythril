/**
 * Brand follows the theme. Semantic state never does.
 *
 * ## The failure this exists for
 *
 * A theme can override any CSS custom property — that is the feature (`theme.service.ts`: a static stylesheet or
 * postMessage tokens). A reporting operator set a red brand colour and watched **"Active" and "Online" turn red
 * while "Healthy" and "Reachable" stayed green**, because `.pill.active` read `--accent` and its four siblings read
 * `--success` / `--warning` / `--error` / `--info`.
 *
 * Their framing is the rule, and it is a category split rather than a bug list:
 *
 *   - **identity** — a selected tab, a highlighted row, a sort caret, a wizard step dot. "You are here." Brand.
 *     These SHOULD move with the theme.
 *   - **state** — configured, in use, online, healthy, degraded, usage-is-fine. A fact about the system. These
 *     must not move, whatever the operator's brand colour is.
 *
 * Auditing every state colour rather than only the pill turned up two more: the summary strip's value colour and
 * the usage bar's healthy fill, both reading `--accent` while their own warn/danger siblings read semantic tokens.
 *
 * ## What this checks
 *
 * The state-bearing CSS classes, by name, across the shared components that own them. A class whose siblings are
 * semantic must not be the one reading the brand.
 *
 * Run: node --test testing/standalone/state-colours-ignore-the-theme.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/**
 * Every declaration that colours a semantic STATE, and the file that owns it.
 *
 * Deliberately a named list rather than a pattern: the distinction between "active tab" and "active state" is
 * semantic, and no regex can make it. A new state class has to be added here — which is the point, because that
 * addition is the moment somebody decides which category it is in.
 */
const STATE_RULES = [
  { file: 'client/src/app/shared/status-pill.component.ts', selectors: ['.pill.active', '.pill.ok', '.pill.warn', '.pill.error', '.pill.pending'] },
  { file: 'client/src/app/shared/summary-strip.component.ts', selectors: ['.v.active, .v.ok', '.v.warn', '.v.error', '.v.pending'] },
  { file: 'client/src/app/shared/usage-bar.component.ts', selectors: ['.fill.ok', '.fill.warn', '.fill.danger'] },
];

/** Tokens a theme is expected to own. A state colour must not read any of them. */
const BRAND = ['--accent', '--accent-hover', '--accent-dim', '--nav-active', '--nav-active-dim'];

/** The declaration block for one selector — from the selector to its closing brace. */
function block(src, selector) {
  const at = src.indexOf(selector);
  if (at < 0) return null;
  const open = src.indexOf('{', at);
  const close = src.indexOf('}', open);
  if (open < 0 || close < 0) return null;
  return src.slice(open, close);
}

describe('semantic state colours do not follow the theme', () => {
  it('found every rule — the selectors still exist', () => {
    const missing = [];
    for (const r of STATE_RULES) {
      const src = read(r.file);
      for (const s of r.selectors) if (block(src, s) === null) missing.push(`${r.file}: ${s}`);
    }
    assert.deepEqual(missing, [], 'a selector in the list no longer exists — the rule below is checking nothing:\n  '
      + missing.join('\n  '));
  });

  it('no state colour reads a brand token', () => {
    const bad = [];
    for (const r of STATE_RULES) {
      const src = read(r.file);
      for (const s of r.selectors) {
        const b = block(src, s) ?? '';
        for (const token of BRAND) {
          // Word-boundary: `--accent-text` is a FOREGROUND paired with the brand and is not a state colour.
          if (new RegExp(`var\\(${token}\\)`).test(b)) bad.push(`${r.file}: ${s} reads var(${token})`);
        }
      }
    }
    assert.deepEqual(bad, [], 'a theme owns identity, not facts. These report state, so a red brand colour would '
      + `recolour them and leave their siblings alone:\n  ${bad.join('\n  ')}\n\n`
      + 'Use --state-active for a positive state, or --success / --warning / --error / --info.');
  });

  it('the state-active token exists and does not resolve to the brand', () => {
    // If it were `var(--accent)` the whole fix would be cosmetic — a theme would still move it.
    const styles = read('client/src/styles.scss');
    const m = styles.match(/--state-active:\s*([^;]+);/);
    assert.ok(m, '--state-active is not defined in styles.scss');
    assert.ok(!/var\(--accent/.test(m[1]),
      '--state-active must be its own value, not an alias of the brand — an alias moves with the theme');
    assert.match(m[1].trim(), /^#[0-9a-fA-F]{3,8}$/, '--state-active should be a literal colour');
  });

  it('the active pill mixes its background from the same token', () => {
    // It was a hardcoded rgba of the DEFAULT accent, so a themed instance got red text on a green pill — the two
    // halves of one pill disagreeing is worse than either colour on its own.
    const b = block(read('client/src/app/shared/status-pill.component.ts'), '.pill.active') ?? '';
    assert.match(b, /background:\s*color-mix\(in srgb, var\(--state-active\)/);
    assert.match(b, /border-color:\s*color-mix\(in srgb, var\(--state-active\)/);
  });

  it('navigation still follows the brand — this is a split, not a purge', () => {
    // The other half of the rule. If a well-meaning sweep converted selected-tab styling to a state token, the
    // theme would stop working for the thing it is actually for.
    const nav = [
      ['client/src/app/pages/settings/space-dialog.styles.ts', '.sp-tab.active'],
      // Moved with the tree itself in G-3's sixth cut; the rule is unchanged, only its file is.
      ['client/src/app/pages/files/file-tree.component.ts', '.tree-node.active'],
      ['client/src/app/pages/brain/sortable-header.component.ts', '.sort-caret.active'],
    ];
    for (const [file, sel] of nav) {
      const b = block(read(file), sel);
      assert.ok(b !== null, `${file}: ${sel} not found`);
      assert.match(b, /var\(--accent/, `${file}: ${sel} is navigation and must follow the brand`);
    }
  });
});
