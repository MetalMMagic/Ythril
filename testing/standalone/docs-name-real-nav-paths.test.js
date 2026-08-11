/**
 * `Settings → X` in the documentation must name something the sidebar actually says.
 *
 * ## The failure
 *
 * The docs give navigation instructions in 46 places. The route names and the labels drifted apart, and
 * nothing compared them, so twelve of those instructions sent a reader looking for a word that is not on
 * screen:
 *
 *  - `/settings/storage` is labelled **Metrics**, and three documents said "Settings → Storage";
 *  - `/settings/audit-log` is labelled **Logs**, and two said "Settings → Audit Log";
 *  - `/settings/data` is labelled **Database**, and three said "Settings → Data";
 *  - `Settings → Connectors`, `Settings → Files` and `Settings → Document extraction` name nothing at all —
 *    Files is a Brain tab and Document extraction is a card inside Spaces;
 *  - `Settings → Conflicts` puts a **Workspace** item under Admin.
 *
 * A wrong menu path is the most concrete kind of documentation defect there is: the reader is looking at
 * the screen while they read it, and the word is not there. It is also invisible to every check we had —
 * `help-anchor-coverage` verifies the per-page help *links*, not the prose telling someone where to click.
 *
 * ## The ground truth is derived, not listed
 *
 * The sidebar is one component. Each entry is a `routerLink` followed by a transloco key, and the key
 * resolves in `en.json`. So this reads the nav out of the source and the labels out of the dictionary, and
 * a hand-kept copy never exists to go stale. **Renaming a nav item now fails the documentation** instead of
 * silently orphaning it, which is the whole point: the rename is the moment the docs become wrong, and it
 * is also the moment nobody is thinking about the docs.
 *
 * ## Only the first segment
 *
 * `Settings → Spaces → Danger Zone` is checked as `Spaces`. Everything past the first arrow is a card, a
 * tab or a button rather than a nav entry, and those are not enumerable from one component — asserting on
 * them would mean an exemption list, which is how a check like this stops being trusted.
 *
 * Run: node --test testing/standalone/docs-name-real-nav-paths.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SHELL = 'client/src/app/pages/shell/shell.component.ts';
const I18N = 'client/public/assets/i18n/en.json';

/**
 * The sidebar, as `{ section, label }` — parsed from the component.
 *
 * Sections are delimited by `nav.section.<name>`; every `routerLink` after one belongs to it until the
 * next. The label is the first `'nav.…'` key after the link, which is how the template is written and has
 * been since the shell was built.
 */
function navEntries() {
  const src = readFileSync(SHELL, 'utf8');
  const dict = JSON.parse(readFileSync(I18N, 'utf8'));
  const out = [];
  let section = null;
  let pendingLink = null;
  // Two token kinds only, and the section is recognised from the KEY rather than as a third alternative.
  // A three-way alternation put `nav.section.workspace` in the wrong capture group — the quote comes first
  // in the text, so the general `'nav.…'` branch matched before the specific one ever saw it, and the
  // section stayed null. Every documented path then read as wrong, including the correct ones. The
  // self-checks below are what caught that; the offender list alone looked like a docs catastrophe.
  const token = /routerLink="(\/[^"]+)"|'(nav\.[A-Za-z.]+)'/g;
  for (const m of src.matchAll(token)) {
    if (m[1]) { pendingLink = m[1]; continue; }
    const key = m[2];
    const sectionMatch = /^nav\.section\.([a-z]+)$/.exec(key);
    if (sectionMatch) { section = sectionMatch[1]; pendingLink = null; continue; }
    if (pendingLink && section) {
      const label = dict[key];
      if (label) out.push({ section, link: pendingLink, key, label });
      pendingLink = null;
    }
  }
  return out;
}

/** `Settings → X` / `Workspace → X` in the docs, reduced to the first segment. */
function documentedPaths() {
  const files = execFileSync('git', ['ls-files', 'docs/*.md', 'docs/*/*.md'], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const out = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split(/\r?\n/).forEach((text, i) => {
      // The label is a run of Capitalised words. Every nav label is one — Tokens, Media Processing, Audit
      // Log, Schema Library — and stopping at the first lowercase word is what keeps a sentence out of it:
      // "Settings → Media Processing exposes a preview" must capture two words, not five.
      //
      // `(?<!→ )` because a `Settings →` that is itself preceded by an arrow is a SEGMENT of a path rooted
      // somewhere else, and that somewhere else is usually another product: the MCP guides walk a reader
      // through `claude.ai → Settings → Connectors`. Rooting those in the product is better for the reader
      // and is the reason this needs no exemption list — a rule about shape rather than about names.
      for (const m of text.matchAll(/(?<!→ )\b(Settings|Workspace)\s*→\s*([A-Z][a-z]*(?: [A-Z][a-z]*)*)/g)) {
        out.push({ file: f, line: i + 1, section: m[1], label: m[2].trim() });
      }
    });
  }
  return out;
}

describe('the check itself works before it is trusted', () => {
  const nav = navEntries();

  it('parses the sidebar out of the component', () => {
    // A parse that returned nothing would make every assertion below vacuous — and this template is the
    // kind of file that gets restructured for reasons unrelated to navigation.
    assert.ok(nav.length >= 10, `parsed ${nav.length} nav entries out of ${SHELL} — expected at least 10`);
    assert.ok(nav.some(e => e.link === '/settings/tokens' && e.label === 'Tokens'),
      'the Tokens entry is missing; the parse is wrong');
  });

  it('resolves the labels that differ from their route, which is the whole point', () => {
    const by = (link) => nav.find(e => e.link === link)?.label;
    assert.equal(by('/settings/storage'), 'Metrics', 'the storage route is labelled Metrics');
    assert.equal(by('/settings/audit-log'), 'Logs', 'the audit-log route is labelled Logs');
    assert.equal(by('/settings/data'), 'Database', 'the data route is labelled Database');
  });

  it('keeps the sections apart', () => {
    const workspace = nav.filter(e => e.section === 'workspace').map(e => e.label);
    const admin = nav.filter(e => e.section === 'admin').map(e => e.label);
    assert.ok(workspace.includes('Conflicts'), 'Conflicts is a Workspace item');
    assert.ok(!admin.includes('Conflicts'), 'Conflicts must not count as an Admin item');
    assert.ok(admin.includes('Tokens') && admin.includes('Database'));
  });

  it('extracts a documented path, and only its first segment', () => {
    const found = documentedPaths();
    assert.ok(found.length >= 20, `only extracted ${found.length} documented nav paths`);
    assert.ok(found.some(p => p.label === 'Media Processing'), 'the commonest path was not extracted');
    assert.ok(!found.some(p => p.label.includes('→')), 'only the first segment may be captured');
    assert.ok(!found.some(p => p.label.includes('Danger')), 'a second segment must not leak into the label');
  });
});

describe('every documented navigation path names something the sidebar says', () => {
  it('sends nobody looking for a label that is not on screen', () => {
    const nav = navEntries();
    const labels = {
      Settings: new Set(nav.filter(e => e.section === 'admin').map(e => e.label)),
      Workspace: new Set(nav.filter(e => e.section === 'workspace').map(e => e.label)),
    };
    const wrong = documentedPaths()
      .filter(p => !labels[p.section].has(p.label))
      .map(p => `${p.file}:${p.line} — "${p.section} → ${p.label}"`)
      .sort();
    assert.deepEqual(wrong, [],
      'These send a reader looking for a sidebar entry that does not exist:\n  ' + `${wrong.join('\n  ')}\n\n`
      + `Admin offers: ${[...labels.Settings].join(', ')}\n`
      + `Workspace offers: ${[...labels.Workspace].join(', ')}\n\n`
      + 'The label is what the sidebar SAYS, not what the route is called — `/settings/storage` reads\n'
      + '"Metrics", `/settings/audit-log` reads "Logs", `/settings/data` reads "Database".');
  });
});
