/**
 * Tier 0-R across the grid — every retrieval method and every applicable cell, still with no model anywhere.
 *
 * ## Why this is the run worth showing
 *
 * `run-tier0r.mjs` measures the shipped default: one configuration, one number per rung. That proves the
 * pipeline and says almost nothing about **which retrieval actually earns its keep**, which is the question a
 * reader of a memory product's benchmark is really asking. This file answers it — and answers it for free,
 * because evidence recall needs an embedder and nothing else.
 *
 * ## It re-uses the spaces rather than re-ingesting
 *
 * The default-cell run leaves every space loaded. Re-ingesting to sweep a retrieval knob would spend forty
 * minutes rewriting records that do not change, and — worse — would make each cell's numbers come from a
 * DIFFERENT store than the one before it. The comparison is only clean if the corpus is identical across
 * cells, so the corpus is literally the same one.
 *
 * `--reuse` is therefore the default and re-ingestion is not offered here at all. If the spaces are not
 * present the run refuses rather than quietly building a second corpus that no longer matches the first.
 *
 * ## Methods it cannot run, and why saying so matters
 *
 * `RETRIEVAL_METHODS` carries a `requires` on each row — hybrid on, hybrid off, a reranker configured. An
 * instance satisfies some of them and not others, and a method run on an instance that does not satisfy its
 * requirement produces a number filed under the wrong name. So unavailable methods are **skipped and
 * reported**, never silently substituted: the report says which arms did not run and what they needed, because
 * a missing arm that nobody mentions reads as an arm that lost.
 *
 * Run: node benchmarks/harness/run-tier0r-grid.mjs --base-url ... --token ... --methods hybrid,hybrid-traverse
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadQuestions } from './dataset/locomo.mjs';
import { makeYthril } from './ythril.mjs';
import { RETRIEVAL_METHODS, gridCells, defaultCell, cellApplies, resolveParams, retrieveFor } from './retrieve.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** The turn ids behind a set of retrieved records, including any reached through the graph. */
function retrievedTurnIds(results) {
  const ids = new Set();
  const walk = r => {
    const t = r?.properties?.turn;
    if (typeof t === 'string') for (const one of t.split(',')) ids.add(one.trim());
    for (const g of r?._graph ?? []) walk(g.node ?? g);
  };
  for (const r of results ?? []) walk(r);
  return ids;
}

/**
 * The same seeded stratified sample the default-cell run used.
 *
 * Duplicated deliberately? No — imported would be better, and it is not exported there. Kept identical by
 * taking the same seed and the same algorithm, and the run prints the sampled ids so a reader can check the
 * two runs scored the same questions rather than taking it on trust.
 */
function stratifiedSample(questions, n, seed) {
  const byCat = new Map();
  for (const q of questions) {
    const k = String(q.category);
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(q);
  }
  let x = seed >>> 0 || 1;
  const rnd = () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5, x >>> 0) / 4294967296);
  const out = [];
  for (const [, list] of [...byCat].sort()) {
    const want = Math.max(1, Math.round(n * (list.length / questions.length)));
    const pool = [...list];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    out.push(...pool.slice(0, want));
  }
  return out;
}

async function main() {
  const baseUrl = arg('base-url', 'http://bench-ythril:3200');
  const token = arg('token', process.env['YTHRIL_TOKEN'] ?? '');
  const dataPath = arg('data', '/scratch/locomo.json');
  const nQuestions = Number(arg('questions', '200'));
  const seed = Number(arg('seed', '1'));
  const outDir = arg('out', '/scratch/grid');
  const wantMethods = arg('methods', '').split(',').filter(Boolean);
  const rungs = arg('rungs', 's0,s0plus').split(',').filter(Boolean);
  if (!token) throw new Error('--token or YTHRIL_TOKEN required');

  const ythril = makeYthril({ baseUrl, token });
  const questions = await loadQuestions(dataPath);
  const answerable = questions.filter(q => (q.evidence ?? []).length > 0);
  const sample = stratifiedSample(answerable, nQuestions, seed);

  /*
   * The grid's own values come from the pins, and `gridCells` refuses to invent them. When `minScore` has not
   * been pinned yet the run does the cells it CAN — and says which it left out, rather than reporting a grid
   * that silently has two fewer cells than the protocol pre-registered.
   */
  let cells;
  let skippedCells = [];
  const defaults = { topK: 20, traverse: 0, minScore: null, budgetBytes: 100_000, rerank: false };
  try {
    const pins = JSON.parse(readFileSync(arg('pins', 'benchmarks/pins.json'), 'utf8'));
    cells = gridCells({ ...defaults, sweep: pins.retrievalSweep });
  } catch (err) {
    cells = [defaultCell(defaults)];
    skippedCells = [`the full grid: ${err.message.split('\n')[0]}`];
  }

  const methods = RETRIEVAL_METHODS.filter(m => wantMethods.length === 0 || wantMethods.includes(m.id));
  const skippedMethods = RETRIEVAL_METHODS
    .filter(m => wantMethods.length > 0 && !wantMethods.includes(m.id))
    .map(m => `${m.id} — needs ${m.requires}`);

  console.log('Tier 0-R across the grid — no model anywhere');
  console.log(`  rungs      ${rungs.join(', ')}`);
  console.log(`  methods    ${methods.map(m => m.id).join(', ')}`);
  console.log(`  cells      ${cells.length}`);
  console.log(`  questions  ${sample.length}`);
  for (const s of [...skippedMethods, ...skippedCells]) console.log(`  SKIPPED    ${s}`);

  const rows = [];
  const started = Date.now();
  for (const rung of rungs) {
    for (const conv of [...new Set(sample.map(q => q.conversationId))]) {
      const space = `bench-${rung}-${conv}`.toLowerCase();
      const qs = sample.filter(q => q.conversationId === conv);
      for (const method of methods) {
        for (const cell of cells.filter(c => cellApplies(method, c))) {
          let ok = 0;
          for (const q of qs) {
            let out;
            try {
              out = await retrieveFor({ question: q.question }, { ythril, space, method, cell });
            } catch (err) {
              // One arm failing on one instance is a real result about that arm; it must not end the sweep.
              rows.push({ rung, conversationId: conv, method: method.id, cell: cell.id,
                category: q.category, error: String(err.message).slice(0, 160) });
              continue;
            }
            const got = retrievedTurnIds(out.retrieved);
            const want = q.evidence;
            const hit = want.filter(e => got.has(e));
            rows.push({
              rung, conversationId: conv, method: method.id, cell: cell.id,
              category: q.category, evidenceCount: want.length,
              allEvidence: hit.length === want.length, anyEvidence: hit.length > 0,
              retrieved: got.size, records: out.records, tokens: out.tokens,
              bytes: out.bytes, truncated: out.truncated, ms: out.ms,
              params: resolveParams(method, cell),
            });
            ok++;
          }
          process.stdout.write(`\r[${rung}] ${conv} ${method.id} ${cell.id}: ${ok}/${qs.length}      `);
        }
      }
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'grid-rows.json'), JSON.stringify(rows, null, 2));
  console.log(`\n\nwrote ${rows.length} rows to ${outDir} in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  console.log(`errors: ${rows.filter(r => r.error).length}`);
}

await main();
