/**
 * Every relative link in the docs must resolve — to a file that exists, and to a heading that exists.
 *
 * ## Why this needed a second attempt
 *
 * The canary reads our documentation INTO Ythril, so a wrong page is not a wrong page — it is a wrong fact in a
 * vector store, retrieved confidently. They found `04-brain-api.md` pointing at a heading that did not exist by
 * enumerating the ingested chunks of the target file and noticing none carried it. Checking the rest of the guide
 * then found **three more of the same shape**, all written as siblings when the target was one directory up.
 *
 * A first version of this gate reported exactly those four and I nearly deleted it as a false-positive generator —
 * the files "obviously exist". They did; the *paths* did not. It was right and I was wrong.
 *
 * It still did not ship, because its heading-slug logic was wrong on its own assertions, and **a link checker I do
 * not trust is worse than none**: it either cries wolf until someone silences it, or it is silenced and stops
 * catching the thing it exists for.
 *
 * ## So the slugifier tests itself first
 *
 * The whole gate rests on reproducing GitHub's heading→anchor rule. If that is wrong, every fragment check is
 * noise. So the first block below pins the rule against cases taken from the real docs — headings with code spans,
 * em dashes, ampersands, slashes, parentheses, digits — and the link checks run on the same function.
 *
 * ## And it strips code before looking for links
 *
 * A fenced block or an inline span can contain `[...](...)` that is not a link (a curl example, a JSON path, a
 * regex). Extracting links from raw Markdown reports those as broken. Both are stripped first.
 *
 * Run: node --test testing/standalone/doc-links-resolve.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, posix } from 'node:path';

const ROOT = process.cwd();

/**
 * GitHub's heading → anchor slug.
 *
 * Lowercase; drop everything that is not a letter, digit, space, hyphen or underscore; spaces become hyphens.
 * Formatting markers (`**`, `` ` ``, `_italics_`) are removed as text BEFORE that, because the anchor is built
 * from the rendered text, not the source.
 */
function slug(heading) {
  return heading
    .replace(/^\s*#{1,6}\s+/, '')           // accepts a whole heading LINE, so the cases below read as they appear
    .replace(/`([^`]*)`/g, '$1')            // code spans render as their contents
    .replace(/\*\*([^*]*)\*\*/g, '$1')      // bold
    .replace(/\*([^*]*)\*/g, '$1')          // italics
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // a link in a heading renders as its text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')      // keep letters, digits, space, underscore, hyphen
    .replace(/ /g, '-');
}

/** Markdown with fenced blocks removed, so a `#` or a `[x](y)` inside a code sample is not read as content. */
function stripFences(md) {
  return md.replace(/^```[\s\S]*?^```/gm, '');
}

/** …and with inline spans removed too. For LINK extraction only — see `anchors` for why not for headings. */
function stripCode(md) {
  return stripFences(md).replace(/`[^`\n]*`/g, '');
}

/**
 * Every heading's anchor in a file, including GitHub's `-1`, `-2` … suffixes for duplicates.
 *
 * Strips FENCES but not inline spans: an anchor is built from the heading's RENDERED text, so
 * `### \`lastSeqServed\` — the mirror watermark` anchors on `lastseqserved--the-mirror-watermark`. Stripping the
 * span first dropped that word and the gate then reported four perfectly good links as broken — which is exactly
 * the kind of false positive that gets a link checker deleted.
 */
function anchors(md) {
  const seen = new Map();
  const out = new Set();
  for (const line of stripFences(md).split(/\r?\n/)) {
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    const base = slug(m[2]);
    if (!base) continue;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  return out;
}

/** `[text](target)` links, excluding images and code, with the line number for the message. */
function links(md) {
  const out = [];
  const lines = stripCode(md).split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (m[1] === '!') continue;                       // an image, not a navigation link
      out.push({ target: m[2], line: i + 1 });
    }
  });
  return out;
}

/** Every tracked Markdown file under docs/. */
function docFiles(dir = 'docs') {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = posix.join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...docFiles(rel));
    else if (name.endsWith('.md')) out.push(rel);
  }
  return out;
}

describe('the heading-slug rule, before it is trusted to judge anything', () => {
  it('matches GitHub on the shapes our own headings actually use', () => {
    const cases = [
      ['## Brain API', 'brain-api'],
      ['### Write a Memory', 'write-a-memory'],
      ['#### Per-type retention — `record > schema > space`', 'per-type-retention--record--schema--space'],
      ['#### The space tier is five windows', 'the-space-tier-is-five-windows'],
      ['## Setup API', 'setup-api'],
      ['### Health Check (unauthenticated)', 'health-check-unauthenticated'],
      ['## Scheduled and offsite backups', 'scheduled-and-offsite-backups'],
      ['#### Configuring the offsite path', 'configuring-the-offsite-path'],
      ['### Prometheus Metrics', 'prometheus-metrics'],
      ['## 1 · Open work', '1--open-work'],
      ['### `lastSeqServed` — the mirror watermark', 'lastseqserved--the-mirror-watermark'],
      ['## Reference integrity', 'reference-integrity'],
      ['## A & B', 'a--b'],
      ['## with_underscores kept', 'with_underscores-kept'],
      ['## **Bold** heading', 'bold-heading'],
    ];
    for (const [heading, expected] of cases) {
      assert.equal(slug(heading), expected, `slug(${JSON.stringify(heading)})`);
    }
  });

  it('numbers a duplicate heading the way GitHub does', () => {
    const md = '# Setup\n\ntext\n\n# Setup\n\nmore\n\n# Setup\n';
    assert.deepEqual([...anchors(md)], ['setup', 'setup-1', 'setup-2']);
  });

  it('does not mistake a code sample for a link', () => {
    const md = [
      'Real: [the guide](../userguide.md)',
      '',
      '```bash',
      'curl "http://x/[a](b.md)"',
      '```',
      '',
      'Inline `[not](a-link.md)` stays out.',
    ].join('\n');
    assert.deepEqual(links(md).map(l => l.target), ['../userguide.md']);
  });

  it('does not treat an image as a navigation link', () => {
    assert.deepEqual(links('![shot](assets/x.png)').map(l => l.target), []);
  });
});

describe('every relative doc link resolves', () => {
  const files = docFiles();

  it('found the docs — the walk still works', () => {
    assert.ok(files.length >= 12, `only found ${files.length} markdown files under docs/`);
    assert.ok(files.includes('docs/userguide.md'), 'docs/userguide.md not among them');
    assert.ok(files.some(f => f.startsWith('docs/integration-guide/')), 'the integration guide was not walked');
  });

  it('found links to check — the extractor still works', () => {
    const total = files.reduce((n, f) => n + links(readFileSync(join(ROOT, f), 'utf8')).length, 0);
    assert.ok(total >= 30, `only extracted ${total} links across ${files.length} files`);
  });

  it('every target file exists', () => {
    const broken = [];
    for (const f of files) {
      for (const { target, line } of links(readFileSync(join(ROOT, f), 'utf8'))) {
        if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;   // external, protocol-relative, or pure fragment
        const [path] = target.split('#');
        if (!path) continue;
        const abs = resolve(ROOT, dirname(f), decodeURIComponent(path));
        if (!existsSync(abs)) broken.push(`${f}:${line} -> ${target}`);
      }
    }
    assert.deepEqual(broken, [], 'these links point at files that do not exist. A reader follows one and lands '
      + `nowhere; a reader who INGESTS the docs stores it as a fact:\n  ${broken.join('\n  ')}`);
  });

  it('every fragment names a heading that exists', () => {
    const broken = [];
    for (const f of files) {
      const md = readFileSync(join(ROOT, f), 'utf8');
      for (const { target, line } of links(md)) {
        if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
        const [path, frag] = target.split('#');
        if (!frag) continue;
        const targetFile = path ? resolve(ROOT, dirname(f), decodeURIComponent(path)) : join(ROOT, f);
        if (!existsSync(targetFile)) continue;                        // reported by the test above
        const have = anchors(readFileSync(targetFile, 'utf8'));
        if (!have.has(decodeURIComponent(frag).toLowerCase())) {
          broken.push(`${f}:${line} -> ${target}  (no such heading in ${relative(ROOT, targetFile).replace(/\\/g, '/')})`);
        }
      }
    }
    assert.deepEqual(broken, [], 'these links name a heading their target does not have. This is the exact shape a '
      + 'canary operator found by enumerating the ingested chunks of the target file and noticing none carried the '
      + `heading:\n  ${broken.join('\n  ')}`);
  });
});
