/**
 * A one-line summary of a converted document, for the record a human actually browses.
 *
 * ## Why this exists
 *
 * After a PDF converts, its file-meta carries `convertedFileId`, `chunkCount` and `embeddingStatus` —
 * and no description. Its `matchedText` is literally the filename. Meanwhile every
 * `_extracted/<id>/image-N.jpg` the same document produced gets a full generated caption from the vision
 * model. So the parent was findable only by its filename while its derived children carried summaries,
 * which is precisely backwards: the parent is the thing anyone opens.
 *
 * ## Extractive, not generative
 *
 * No model call. Two reasons, and the second is the one that matters:
 *
 *  - Summarising every document would put a VLM call on the ingest path of every upload, on an instance
 *    that may have no VLM configured at all.
 *  - More importantly, a generated summary can be **wrong** — it can assert something the document does
 *    not say. A description that quietly misrepresents a record is worse than no description, because
 *    search will match it and a reader will believe it. Taking the document's own opening prose cannot
 *    invent anything: at worst it is unhelpful.
 *
 * So: the first real sentence or two of the document's own text, with the scaffolding removed.
 */

import type { Chunk } from './types.js';

/** Roughly a card's worth of text — long enough to identify a document, short enough to scan. */
const MAX_CHARS = 240;

/**
 * Strip the Markdown that carries no meaning when read as a sentence.
 *
 * Deliberately conservative. This is not a Markdown parser and does not try to be — it removes the
 * decorations that would read as noise in a one-line description and leaves everything else alone,
 * because mangling the text is worse than leaving a stray character in it.
 */
function flatten(md: string): string {
  return md
    .replace(/^---[\s\S]*?^---/m, ' ')          // YAML front-matter
    .replace(/```[\s\S]*?```/g, ' ')            // fenced code
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')         // heading markers (keep the heading TEXT)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // links → their text
    .replace(/^\s{0,3}>\s?/gm, '')              // blockquotes
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')  // list markers
    .replace(/^\s*\|.*\|\s*$/gm, ' ')           // table rows — cell soup reads as gibberish
    .replace(/[*_`~]/g, '')                     // inline emphasis / code
    .replace(/\s+/g, ' ')
    .trim();
}

/** True for text that would tell a reader nothing — page furniture rather than content. */
function isNoise(s: string): boolean {
  // No length floor beyond "not empty". An earlier version dropped anything under 12 characters, which
  // threw away real headings — "Overview." is the first thing a reader wants and is nine characters.
  // What actually distinguishes furniture from content is having no letters, or being a page/figure
  // label; both are checked directly.
  if (s.length < 3) return true;
  if (!/[a-zA-Z]/.test(s)) return true;                  // page numbers, rules, symbols
  if (/^(page|figure|table)\s+\d+\s*\.?$/i.test(s)) return true;
  return false;
}

/**
 * Summarise a converted document.
 *
 * Falls back from the whole converted Markdown to the chunk bodies, because the two extraction paths do
 * not both produce a single document: `md`/`txt` sources are already Markdown and yield `null` there.
 * Returns undefined when there is nothing worth saying — an empty or noise-only document gets no
 * description rather than a misleading one.
 */
export function summariseMarkdown(md: string | null, chunks: Chunk[] = []): string | undefined {
  const source = (md && md.trim())
    ? md
    : chunks.map(c => [c.headingText, c.content].filter(Boolean).join('. ')).join('\n\n');

  const flat = flatten(source ?? '');
  if (!flat) return undefined;

  // Sentence-ish split. Keeping the terminator makes the result read as prose rather than as a fragment.
  const parts = flat.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => !isNoise(s));
  if (parts.length === 0) return undefined;

  let out = '';
  for (const p of parts) {
    if (out && (out.length + 1 + p.length) > MAX_CHARS) break;
    out = out ? `${out} ${p}` : p;
    if (out.length >= MAX_CHARS) break;
  }
  if (!out) out = parts[0]!;

  if (out.length > MAX_CHARS) {
    // Cut on a word boundary; a description ending mid-word looks like corruption.
    const cut = out.slice(0, MAX_CHARS);
    const lastSpace = cut.lastIndexOf(' ');
    out = `${(lastSpace > MAX_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
  }
  return out;
}
