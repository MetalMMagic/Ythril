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
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
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
 * A guide as one document: its parts in order, not its index.
 *
 * `docs/integration-guide.md` and `docs/userguide.md` are link lists by design — a check that reads one
 * is reading a contents page and concluding the guide says nothing.
 *
 * **A split is detected, not listed.** The first version named `integration-guide` literally, and the
 * userguide split then needed every caller found and changed by hand. The rule is structural instead: if
 * `docs/x.md` has a sibling `docs/x/` directory, `docs/x.md` is that guide's index and the guide is its
 * parts. A guide that is later split needs no edit here, and one that is merged back needs none either.
 */
export function readSplit(rel) {
  const name = rel.replace(/^docs\//, '').replace(/\.md$/, '');
  const dir = join(DOCS_ROOT, name);
  // `isDirectory`, not merely `existsSync`: `docs/network-types.md` exists as a file at the stripped path
  // on no platform, but the day one does, an existence check would hand a file to `readdirSync`.
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return readFileSync(join(DOCS_ROOT, `${name}.md`), 'utf8');
  return readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    .map(f => readFileSync(join(dir, f), 'utf8')).join('\n');
}

/** The integration guide as one document. Kept as a name because most callers ask for exactly this one. */
export function readGuide() {
  return readSplit('integration-guide.md');
}

/**
 * One named doc, with a split guide resolved to its parts.
 *
 * NOT for a check that compares two documents against each other. `16-mcp.md` is a part of the
 * integration guide, so resolving both sides of a "REST doc and MCP doc both say X" comparison through
 * here makes them the same string and the check vacuous. Name the parts in that case.
 */
export function readDoc(rel) {
  return readSplit(rel);
}
