/**
 * Parse a labelled duplicate-detection bench file into pairs and texts.
 *
 * ## The data lives outside this repository, on purpose
 *
 * The bench is drawn from real deployment records — architecture decisions, alert history, cluster
 * configuration. This repository is public. So the file is never committed, never fixtured, and never
 * quoted in a test: {@link assertDataPathIsOutsideRepo} refuses a path inside the worktree before a
 * single byte is read, and the parser's own tests run against a synthetic fixture defined inline.
 *
 * ## Why a parser rather than a JSON schema
 *
 * The bench is written and reviewed as prose — the "why it is hard" column is the most valuable part of
 * it, and it only stays accurate if the person labelling reads and edits it as a document. Asking for
 * JSON would trade the reviewability that makes the labels trustworthy for parsing convenience.
 *
 * The trade is safe only if parsing failures are loud. A parser that silently finds three pairs would
 * benchmark three pairs and report a confident number, which is worse than not running. Hence
 * {@link parseBenchFile} validates aggressively: known labels, every referenced id resolvable, and a
 * caller-supplied expected pair count.
 *
 * ## Format
 *
 *   Pair rows:  | <id> | <A> | <B> | `<label>` | <why> |
 *   Texts:      ### <ID> [— optional description]
 *               > blockquoted body, until the next heading or rule
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The labels the bench uses, and whether a pair carrying one may be merged. */
export const LABELS = {
  duplicate: { merge: true, note: 'same content, same substance; wording or language may differ' },
  subsumes: { merge: false, note: 'a refinement or special case; both must survive' },
  supersedes: { merge: false, note: 'replaces the other; both must survive as decision history' },
  recurrence: { merge: false, note: 'same condition, different occurrence; text may be identical' },
  distinct: { merge: false, note: 'different subjects' },
  contradicts: { merge: false, note: 'actively opposed statements about the same subject' },
};

const PAIR_ROW = /^\|\s*([A-Za-z]?\d+)\s*\|\s*([A-Za-z0-9-]+)\s*\|\s*([A-Za-z0-9-]+)\s*\|\s*`([a-z]+)`\s*\|/;

/**
 * The id is the first token after the hashes; anything after it is a human description.
 *
 * Deliberately permissive. An earlier version required the remainder to be an em-dash clause and
 * therefore silently skipped `### S-DE-RADIUS-MD *(synthetic)*` — and a heading regex that misses
 * produces a "text not found" error pointing at the pair table, which is the wrong place to look.
 * Headings that are not record ids (`### Block B`) parse into inert map entries; validation is by
 * reference resolution, so nothing depends on this regex being selective.
 */
const HEADING = /^###\s+(\S+)/;

/**
 * Normalise line endings before anything else touches the source.
 *
 * The file is authored on Windows and arrives CRLF. Every `$`-anchored pattern then fails against the
 * trailing `\r` while unanchored ones still match — so the pair table parsed perfectly and every single
 * appendix heading was skipped, which surfaced as "8 pair references have no text". This repo has been
 * bitten by exactly this before (a conflict-marker strip that matched nothing and reported success).
 */
const normalise = (src) => src.replace(/\r\n?/g, '\n');

/**
 * Refuse to read bench data from inside the git worktree.
 *
 * The guard is structural rather than a naming convention because a naming convention is exactly what
 * fails under time pressure. A file that cannot be reached from inside the repository cannot be
 * committed from inside it either.
 */
export function assertDataPathIsOutsideRepo(dataPath, repoRoot) {
  const resolved = path.resolve(dataPath);
  const root = path.resolve(repoRoot);
  const rel = path.relative(root, resolved);
  const inside = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (inside) {
    throw new Error(
      `Refusing to read bench data from inside the repository: ${resolved}\n`
      + 'This repo is public and the bench is drawn from real deployment records. Keep the file outside\n'
      + 'the worktree entirely and point YTHRIL_BENCH_DATA at it.',
    );
  }
  return resolved;
}

/**
 * Pull the blockquoted body under each `### <ID>` heading.
 *
 * Blockquote markers, bold and inline code are stripped so what reaches the embedding model is the text
 * a record actually carries, not its markdown presentation. Newlines collapse to single spaces for the
 * same reason: the bench reproduces records in the shape the system embeds them, and that shape is one
 * concatenated string.
 */
export function extractTexts(rawSrc) {
  const texts = new Map();
  const lines = normalise(rawSrc).split('\n');
  let current = null;
  let buf = [];

  const flush = () => {
    if (!current) return;
    const body = buf
      .join('\n')
      .replace(/^>\s?/gm, '')
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (body.length > 0) texts.set(current, body);
    current = null;
    buf = [];
  };

  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h) { flush(); current = h[1]; continue; }
    if (current === null) continue;
    // A horizontal rule or a non-### heading ends the block.
    if (/^---+\s*$/.test(line) || /^#{1,2}\s/.test(line)) { flush(); continue; }
    buf.push(line);
  }
  flush();
  return texts;
}

/** Pull the labelled pairs from the block tables. */
export function extractPairs(rawSrc) {
  const pairs = [];
  for (const line of normalise(rawSrc).split('\n')) {
    const m = PAIR_ROW.exec(line);
    if (!m) continue;
    const [, id, a, b, label] = m;
    // The table header separator (|---|---|) and prose rows cannot reach here: the id column must be
    // digits with an optional leading letter, and the label column must be a backticked lowercase word.
    if (!(label in LABELS)) {
      throw new Error(`Unknown label '${label}' on pair ${id}. Known: ${Object.keys(LABELS).join(', ')}`);
    }
    pairs.push({ id, a, b, label, block: /^[A-Za-z]/.test(id) ? id[0].toUpperCase() : 'A' });
  }
  return pairs;
}

/**
 * Read, parse and validate.
 *
 * `expectedPairs` is required rather than optional. The failure this guards against — a format drift
 * that silently halves the set — produces a plausible-looking report, and a bench that quietly measures
 * a different question than the one asked is the specific way benchmarks mislead.
 */
export function parseBenchFile(dataPath, { repoRoot, expectedPairs }) {
  const resolved = assertDataPathIsOutsideRepo(dataPath, repoRoot);
  const src = readFileSync(resolved, 'utf8');
  return parseBenchSource(src, { expectedPairs });
}

/** The pure half, so tests can drive it with a synthetic fixture. */
export function parseBenchSource(src, { expectedPairs } = {}) {
  const texts = extractTexts(src);
  const pairs = extractPairs(src);

  if (expectedPairs != null && pairs.length !== expectedPairs) {
    throw new Error(
      `Parsed ${pairs.length} pairs, expected ${expectedPairs}. The table format has drifted; a bench `
      + 'that measures a subset would report a confident number for a different question.',
    );
  }

  const missing = [];
  for (const p of pairs) {
    for (const ref of [p.a, p.b]) {
      if (!texts.has(ref)) missing.push(`${p.id}: ${ref}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `${missing.length} pair reference(s) have no text in the appendix:\n  ${missing.join('\n  ')}`,
    );
  }

  return { pairs, texts };
}

/**
 * The binary question a similarity score is being asked.
 *
 * Only `duplicate` may merge. Everything else — including `recurrence`, whose two texts can be
 * byte-identical — must not. That asymmetry is the whole finding of the alerts block: similarity is
 * *correct* there and merging is still *wrong*, so no threshold on any text score can separate them.
 * Only structured fields can.
 */
export function shouldMerge(label) {
  return LABELS[label]?.merge === true;
}
