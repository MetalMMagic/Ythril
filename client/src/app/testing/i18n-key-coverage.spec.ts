/**
 * Every translation key referenced in the source must exist in en.json — and en/de/pl must agree.
 *
 * This exists because a missing key fails INVISIBLY. Transloco renders the key itself, so the UI shows
 * `mediaProcessing.face.enable` where a sentence should be; the component still builds, the unit tests
 * still pass (the test harness deliberately echoes raw keys), and nothing goes red. The only detector is
 * a human looking at that exact screen.
 *
 * It was written while migrating the old `models.*` namespace to `mediaProcessing.*` — 182 keys across
 * three locales and every template that referenced them. A single missed reference would have shipped a
 * raw key into the UI with every existing test still green. On its very first run it also found two keys
 * that had been missing on main all along (`schemaLib.field.schema` / `schemaLib.field.schemaHint`), which
 * is the whole argument for having it.
 *
 * Scope note: it matches STATIC keys — string literals handed to the transloco pipe or service. Keys built
 * at runtime (`'x.' + kind`) can't be checked this way and are deliberately not attempted; the point is to
 * catch typos and half-finished renames, which are always static.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '..');
const I18N = resolve(__dirname, '../../../public/assets/i18n');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const load = (loc: string): Record<string, string> =>
  JSON.parse(readFileSync(join(I18N, `${loc}.json`), 'utf8'));

/**
 * Static translation keys used in the source. Matches the two shapes the app actually uses:
 *   {{ 'some.key' | transloco }}   and   transloco.translate('some.key')
 * A key is `word.word(.word)*` — requiring a dot avoids sweeping up every unrelated string literal.
 */
function usedKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const KEY = /'([a-zA-Z][\w-]*(?:\.[\w-]+)+)'\s*(?:\|\s*transloco|\))/g;
  const TRANSLATE = /translate\(\s*'([a-zA-Z][\w-]*(?:\.[\w-]+)+)'/g;
  for (const file of walk(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const re of [KEY, TRANSLATE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const key = m[1];
        // Only treat it as a translation key when en.json actually has that NAMESPACE — otherwise the
        // pattern also matches import paths, css classes and the like. A wholly-unknown namespace is not
        // evidence of a missing translation, but a known namespace with an unknown leaf is.
        if (!found.has(key)) found.set(key, []);
        found.get(key)!.push(file.slice(SRC.length + 1));
      }
    }
  }
  return found;
}

describe('i18n key coverage', () => {
  const en = load('en');
  const namespaces = new Set(Object.keys(en).map(k => k.split('.')[0]));

  it('every static key used in the source exists in en.json', () => {
    const missing: string[] = [];
    for (const [key, files] of usedKeys()) {
      const ns = key.split('.')[0];
      if (!namespaces.has(ns)) continue;      // not a translation namespace at all
      if (!(key in en)) missing.push(`${key}  (used in ${[...new Set(files)].join(', ')})`);
    }
    expect(missing, `translation keys referenced in the source but absent from en.json:\n  ${missing.join('\n  ')}`)
      .toEqual([]);
  });

  it('no locale defines the same key twice', () => {
    /*
     * `JSON.parse` keeps the LAST of two identical keys and reports nothing, so a duplicate is invisible in
     * every way that matters: the file parses, the key count looks right, `Object.keys` shows one entry, and
     * both of the checks above pass. What the reader sees is the other definition's text.
     *
     * Found by writing one. U-1 added `brain.query.projection` for the recall form without noticing the
     * Advanced Query panel had defined it 71 lines further down; the new label was simply never used, and
     * the only detector was a screenshot showing the old word.
     *
     * So this reads the FILE rather than the parsed object — a parsed object cannot answer the question,
     * which is the whole reason the duplicate survived.
     */
    for (const loc of ['en', 'de', 'pl']) {
      const src = readFileSync(join(I18N, `${loc}.json`), 'utf8');
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const m of src.matchAll(/^\s*"([^"]+)":/gm)) {
        if (seen.has(m[1])) dupes.push(m[1]);
        seen.add(m[1]);
      }
      expect(dupes, `${loc}.json defines these keys twice — the second wins silently`).toEqual([]);
    }
  });

  it('de and pl carry exactly the same keys as en', () => {
    const enKeys = Object.keys(en).sort();
    for (const loc of ['de', 'pl']) {
      const keys = Object.keys(load(loc)).sort();
      const missing = enKeys.filter(k => !keys.includes(k));
      const extra = keys.filter(k => !enKeys.includes(k));
      expect(missing, `${loc}.json is missing keys present in en.json`).toEqual([]);
      expect(extra, `${loc}.json has keys that no longer exist in en.json`).toEqual([]);
    }
  });
});
