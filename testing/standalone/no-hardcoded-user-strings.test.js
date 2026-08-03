/**
 * No user-facing sentence in the client may bypass transloco.
 *
 * ## The finding — Accessibility & Internationalization audit lens
 *
 * The lens note claimed "settings pages already have English literals bypassing transloco — e.g. data-management
 * errors, import-conflict dialogs". Quantified rather than trusted: **125 client files scanned, 4 offenders, and
 * none of them in the places the note named.** That half of the claim had been fixed since it was written, and
 * `_REFERENCE.md` now records the corrected version — a stale suspicion in a tracker buys a PR that reimplements
 * something already done.
 *
 * The four were worth fixing, and one of them was worse than a missing translation:
 *
 *   `schemaLib.error.nameRequired` **already existed in all three locales** — `"Eintragsname ist erforderlich."`
 *   sat in the bundle while the component hard-coded `'Name is required.'` two lines away. A German operator read
 *   English at exactly the moment they had made a mistake and most needed to read it.
 *
 * Template text nodes were checked too: **zero** offenders. The discipline is good; it was the TypeScript side that
 * had drifted, because a `.set('…')` in an error path never looks like a translation problem.
 *
 * ## What this gate holds
 *
 * That a literal cannot come back. It scans message sinks (`error.set('…')`, `alert(…)`, and the text-bearing
 * template attributes) for anything shaped like a sentence, and it is deliberately shy of one-word strings and of
 * anything that never reaches a screen — a gate with false positives is a gate that gets deleted.
 *
 * Run: node --test testing/standalone/no-hardcoded-user-strings.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every component/service source in the client, excluding specs. */
function clientSources(dir = join('client', 'src', 'app'), out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) clientSources(p, out);
    else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

/**
 * Looks like a sentence shown to a person: capitalised, three or more words.
 *
 * Deliberately narrow. A one- or two-word string is as likely to be a CSS value, an id, a header name or a test
 * fixture as it is to be copy, and a gate that flags those gets switched off within a week.
 */
const SENTENCE = /^[A-Z][A-Za-z0-9'’(),/-]*(?: [A-Za-z0-9'’“”(),.:;/–—-]+){2,}[.!?]?$/;

/** Sinks whose argument reaches the screen. */
const SINKS = [
  /\b(?:error|Error|message|toast|notice|warning|status|dialogError|exportError|banner)\s*\.set\(\s*'([^']{8,})'/g,
  /\b(?:error|Error|message|toast|notice|warning|status)\s*\.set\(\s*"([^"]{8,})"/g,
  /\b(?:alert|confirm|prompt)\(\s*'([^']{8,})'/g,
  /\b(?:placeholder|title|aria-label|alt)="([A-Z][^"]{7,})"/g,
];

function scan() {
  const hits = [];
  for (const f of clientSources()) {
    const src = readFileSync(f, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      const code = line.trim();
      // Comments never count as code. Four gates this session fired on their own documentation before this
      // was made a habit — the comment explaining a fix quotes the pattern it warns against.
      if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
      if (line.includes('transloco')) return;
      for (const re of SINKS) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line)) !== null) {
          if (SENTENCE.test(m[1])) hits.push(`${f}:${i + 1}  ${m[1]}`);
        }
      }
    });
  }
  return hits;
}

describe('the scan works before it is trusted', () => {
  it('sees the whole client', () => {
    // A rename that reduced this to zero files would make the assertion below pass by examining nothing.
    const files = clientSources();
    assert.ok(files.length > 100, `expected the client tree, found ${files.length} files`);
  });

  it('recognises a sentence, and ignores what is not one', () => {
    // The sentence heuristic is the whole gate. If it drifts, the sweep either cries wolf or goes blind.
    for (const yes of ['Name is required.', 'Could not save the entry', 'Schema is not valid JSON.']) {
      assert.ok(SENTENCE.test(yes), `should be treated as copy: ${yes}`);
    }
    for (const no of ['Bearer', 'application/json', 'X-TOTP-Code', 'flex-start', 'ythril_…']) {
      assert.ok(!SENTENCE.test(no), `should NOT be treated as copy: ${no}`);
    }
  });
});

describe('no user-facing sentence bypasses transloco', () => {
  it('every message sink goes through a translation', () => {
    const hits = scan();
    assert.deepEqual(hits, [],
      'these put an English sentence on the screen without going through transloco, so a German or Polish operator '
      + 'reads English — usually in an error path, which is the worst place for it:\n  ' + hits.join('\n  '));
  });
});

describe('a translation that exists is actually used', () => {
  it('the schema-library validation messages use their keys', () => {
    // The sharpest version of this finding: `schemaLib.error.nameRequired` already existed in all three locales
    // while the component hard-coded the English two lines away. The translation was not missing — it was unused.
    //
    // Re-pointed from `pages/settings/schema-library.component.ts` to the LIVE page: that settings copy was
    // unreachable dead code (no route, no importer) and has been deleted, which means this gate had been
    // guarding a file nobody could open. `typeRequired` went with it — the live page derives typeName from the
    // entry name, so there is no separate type field to validate.
    const src = readFileSync(join('client', 'src', 'app', 'pages', 'schema-library', 'schema-library.component.ts'), 'utf8');
    // Anchored on the DECLARATION, not the first textual match: `(click)="saveEntry()"` appears in the inline
    // template hundreds of lines earlier, so `indexOf('saveEntry()')` would slice the template, not the method.
    // This is the recorded failure mode for slices in this repo.
    const at = src.indexOf('saveEntry(): void {');
    assert.ok(at > 0, 'saveEntry is gone — re-anchor this gate');
    const body = src.slice(at, src.indexOf('\n  }', at));
    for (const key of ['schemaLib.error.nameRequired', 'schemaLib.error.saveFailed']) {
      assert.ok(body.includes(key), `${key} exists in every locale but saveEntry does not use it`);
    }
  });

  it('every key those two components reference exists in all three locales', () => {
    // A missing key renders as the raw key in the UI, which reads as a bug rather than a translation gap.
    const KEYS = [
      'schemaLib.error.nameRequired', 'schemaLib.error.saveFailed',
      'oidcCallback.error.missingCode',
    ];
    for (const lang of ['en', 'de', 'pl']) {
      const t = JSON.parse(readFileSync(join('client', 'public', 'assets', 'i18n', `${lang}.json`), 'utf8'));
      for (const k of KEYS) {
        assert.ok(typeof t[k] === 'string' && t[k].trim().length > 0, `${lang}.json is missing ${k}`);
      }
    }
  });

  it('the German and Polish strings carry their diacritics', () => {
    // Not pedantry: the first pass at this batch's other strings wrote ASCII substitutes ("unvollstandig"), which
    // would have shipped. A translation that looks careless undermines the feature it describes.
    //
    // Scanned across EVERY value rather than asserted on one hand-picked key. The key-pinned version broke the
    // moment that key was deleted, and — worse — it could only ever see the one string somebody remembered: a
    // new ASCII-mangled translation anywhere else passed it. These patterns are the specific mistakes made.
    const de = JSON.parse(readFileSync(join('client', 'public', 'assets', 'i18n', 'de.json'), 'utf8'));
    const pl = JSON.parse(readFileSync(join('client', 'public', 'assets', 'i18n', 'pl.json'), 'utf8'));

    const MANGLED_DE = [/\bungultig/i, /\bgultig/i, /\bfur\b/i, /\bkonnen\b/i, /\bmoglich/i,
      /\bunvollstandig/i, /\bmussen\b/i, /\bloschen/i, /\bzuruck/i];
    const MANGLED_PL = [/\bzaladow/i, /\bnieprawidlow/i, /\bblad\b/i, /\bnastepn/i, /\bwiecej\b/i, /\bpolacz/i];

    const hits = [];
    for (const [locale, table, patterns] of [['de', de, MANGLED_DE], ['pl', pl, MANGLED_PL]]) {
      for (const [key, value] of Object.entries(table)) {
        if (typeof value !== 'string') continue;
        for (const re of patterns) if (re.test(value)) hits.push(`${locale}.json ${key}: ${value}`);
      }
    }
    assert.deepEqual(hits, [], 'these translations spell a diacritic word in ASCII:\n  ' + hits.join('\n  '));

    // And the files must still be full of diacritics — if a build step ever mangles the encoding wholesale,
    // the blocklist above would come back clean because every word would be unrecognisable.
    assert.ok(Object.values(de).filter(v => /[äöüßÄÖÜ]/.test(v)).length > 300, 'de.json lost its umlauts');
    assert.ok(Object.values(pl).filter(v => /[ąćęłńóśźż]/.test(v)).length > 600, 'pl.json lost its diacritics');
  });
});
