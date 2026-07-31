/**
 * Reading the docs, for the checks that read the docs.
 *
 * Splitting the integration guide into `docs/integration-guide/NN-topic.md` broke **six** gates in one
 * go — every one of them opened `docs/integration-guide.md` or listed `docs/` one level deep, and every
 * one of them started passing or failing for a reason that had nothing to do with what it checks. Two
 * would have gone on passing while examining nothing.
 *
 * Six copies of the same two lines is what made that a six-file fix. There is one copy now.
 *
 * The split is a fact about how the guide is STORED. A check that cares whether a sentence exists should
 * not have to know it, which is exactly what `readGuide()` provides.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOCS_ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'docs');

/**
 * Every markdown file under `docs/`, at any depth, as paths relative to `docs/`.
 *
 * `readdirSync('docs')` does not descend, and neither does `git ls-files 'docs/*.md'`. Both looked
 * correct and both silently stopped seeing most of the documentation.
 */
export function docFiles(dir = DOCS_ROOT, prefix = '', out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) docFiles(join(dir, e.name), `${prefix}${e.name}/`, out);
    else if (e.name.endsWith('.md')) out.push(`${prefix}${e.name}`);
  }
  return out;
}

/** Every doc's text, concatenated — for "is this mentioned anywhere" questions. */
export function allDocsText() {
  return docFiles().map(f => readFileSync(join(DOCS_ROOT, f), 'utf8')).join('\n');
}

/**
 * The integration guide as one document: its parts in order, not its index.
 *
 * `docs/integration-guide.md` is a link list by design — a check that reads it is reading a contents
 * page and concluding the guide says nothing.
 */
export function readGuide() {
  const dir = join(DOCS_ROOT, 'integration-guide');
  if (!existsSync(dir)) return readFileSync(join(DOCS_ROOT, 'integration-guide.md'), 'utf8');
  return readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    .map(f => readFileSync(join(dir, f), 'utf8')).join('\n');
}

/** One named doc, with the guide resolved to its parts. */
export function readDoc(rel) {
  const name = rel.replace(/^docs\//, '');
  return name === 'integration-guide.md' ? readGuide() : readFileSync(join(DOCS_ROOT, name), 'utf8');
}
