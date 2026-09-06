/**
 * The question sample — one implementation, and now two callers.
 *
 * ## Why this is a module rather than a function in the runner
 *
 * `run-tier0r.mjs` picks a stratified, seeded sample so the same questions serve every rung and every grid
 * cell. Tier 0 needs the SAME sample for a different reason: its answers have to be comparable to the
 * retrieval numbers already published for those questions, and to the no-context control asked alongside
 * them.
 *
 * Two copies of "which questions are we grading" is the defect this repository produces most, and here it has
 * a specific failure mode: the copies would drift, the two tiers would silently be measuring different
 * questions, and every table putting them side by side would be comparing things that were never comparable.
 *
 * Extracted, not re-typed. Same seed and same `n` must give the same list as the published run.
 */

/**
 * A stratified, seeded sample.
 *
 * Stratified by category because the categories are wildly unequal — one is 42% of the LoCoMo release and
 * another 22% — so a uniform sample would report a number dominated by whichever happens to be largest.
 *
 * Seeded because a re-run that grades different questions produces different numbers for no reason anybody
 * can see, and a benchmark whose sample moves cannot be re-derived by a sceptic.
 *
 * @param {Array<object>} questions  the answerable questions
 * @param {number} n                 target size; per-category shares are rounded, so the total is approximate
 * @param {number} seed
 */
export function stratifiedSample(questions, n, seed) {
  const byCat = new Map();
  for (const q of questions) {
    const k = String(q.category);
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(q);
  }
  // A tiny deterministic PRNG. `Math.random()` would make the sample unreproducible, which is the one thing a
  // sample must not be.
  let x = seed >>> 0 || 1;
  const rnd = () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5, x >>> 0) / 4294967296);
  const out = [];
  for (const [cat, list] of [...byCat].sort()) {
    const want = Math.max(1, Math.round(n * (list.length / questions.length)));
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    out.push(...pool.slice(0, want).map(q => ({ ...q, _stratum: cat })));
  }
  return out;
}
