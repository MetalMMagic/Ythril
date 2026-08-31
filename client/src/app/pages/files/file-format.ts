/**
 * Formatting shared by the file manager and the pieces extracted out of it.
 *
 * ## Why a module rather than a copy
 *
 * The preview extraction (G-3) needed `formatSize` for one row of its metadata card, and the tempting move was
 * four lines of pure arithmetic copied across. That is this codebase's most expensive defect in miniature —
 * one rule with two implementations, where the weaker one wins silently — and it is on the project's own list
 * of things to extract instead. A size that reads `1.5 KB` in the table and `2 KB` in the preview is a bug
 * nobody would file and everybody would notice.
 */

/**
 * A byte count as a human-readable size.
 *
 * **The boundary belongs to the LARGER unit** — 1023 is `1023 B`, 1024 is `1.0 KB` — and the precision widens
 * with the unit: none for bytes, one decimal for KB and MB, two for GB. That last step is deliberate rather
 * than an oversight: a figure in gigabytes moves slowly enough that a single decimal looks stuck.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
