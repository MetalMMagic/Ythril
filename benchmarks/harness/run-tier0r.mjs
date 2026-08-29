/**
 * Tier 0-R — evidence recall, no model anywhere.
 *
 * Defined in `PROTOCOL.md` (Amendment 4) BEFORE this file ran, which is the ordering the whole protocol exists
 * to make checkable. Read that section before reading this one: what the metric is, and — more usefully — the
 * four things it explicitly cannot say.
 *
 * ## What it does
 *
 * For each conversation, for each model-free ingestion rung, write the records into a fresh space; then for each
 * sampled question run every retrieval method and every grid cell and ask one question of the result:
 * **did the turns the gold answer is evidenced by come back?**
 *
 * No answerer, no judge, no API key, no money. Ythril's embeddings run in-process, so the only cost is time.
 *
 * ## Why the evidence ids are allowed here when the ingest may not see them
 *
 * The blindness rule is about INGESTION: shaping what you store around the answer key is overfitting, and a gate
 * refuses it. Grading is the opposite activity — a benchmark that could not look at the gold answer could not
 * score anything. The separation is enforced structurally: this file imports the questions, and nothing under
 * `ingest/` can.
 *
 * Run: node benchmarks/harness/run-tier0r.mjs --base-url http://localhost:3260 --token <admin> [--questions 200]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConversations, loadQuestions } from './dataset/locomo.mjs';
import { makeYthril } from './ythril.mjs';
import * as s0 from './ingest/s0-raw-turns.mjs';
import * as s0plus from './ingest/s0plus-deterministic-structure.mjs';

const RUNGS = [s0, s0plus];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/**
 * A stratified sample, seeded, so the SAME questions serve every rung and every cell.
 *
 * Stratified by category because the categories are wildly unequal — one is 42% of the release and another 22% —
 * so a uniform sample would report a number dominated by whichever happens to be largest. Seeded because a
 * re-run that grades different questions produces different numbers for no reason anybody can see.
 */
function stratifiedSample(questions, n, seed) {
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

/** Which retrieved records correspond to source turns, by the `turn` property S0 writes. */
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

async function main() {
  const baseUrl = arg('base-url', 'http://localhost:3260');
  const token = arg('token', process.env['YTHRIL_TOKEN'] ?? '');
  const nQuestions = Number(arg('questions', '200'));
  const seed = Number(arg('seed', '1'));
  const dataPath = arg('data', 'C:/Users/Menne/AppData/Local/Temp/claude/'
    + 'o--Projects-Ythril/05520b39-5061-4b20-aa16-5910a7bfe7f7/scratchpad/locomo.json');
  if (!token) throw new Error('--token or YTHRIL_TOKEN required — the harness talks over the real REST door');

  const ythril = makeYthril({ baseUrl, token });
  const conversations = await loadConversations(dataPath);
  const questions = await loadQuestions(dataPath);

  // Excluded, with the count printed rather than a total that quietly does not add up.
  const answerable = questions.filter(q => (q.evidence ?? []).length > 0);
  const excludedNoEvidence = questions.length - answerable.length;
  const sample = stratifiedSample(answerable, nQuestions, seed);

  console.log(`Tier 0-R — evidence recall, no model anywhere`);
  console.log(`  conversations   ${conversations.length}`);
  console.log(`  questions       ${sample.length} sampled from ${answerable.length} answerable `
    + `(${excludedNoEvidence} excluded: no evidence cited)`);
  console.log(`  rungs           ${RUNGS.map(r => r.rung).join(', ')}`);

  const rows = [];
  for (const rung of RUNGS) {
    for (const conv of conversations) {
      const space = `bench-${rung.rung.replace('+', 'plus')}-${conv.id}`.toLowerCase();
      process.stdout.write(`\n[${rung.rung}] ${conv.id}: `);
      await ythril.deleteSpace(space).catch(() => {});
      await ythril.createSpace(space);
      const t0 = Date.now();
      const { records, modelCalls } = await rung.ingest({ conversation: conv, ythril, space });
      process.stdout.write(`${records} records (${modelCalls} model calls) `);
      await ythril.waitForEmbeddings(space, { timeoutMs: 20 * 60_000 });
      const ingestMs = Date.now() - t0;
      process.stdout.write(`embedded in ${(ingestMs / 1000).toFixed(0)}s, `);

      const qs = sample.filter(q => q.conversationId === conv.id);
      let asked = 0;
      for (const q of qs) {
        // The default configuration only, at this stage: the grid multiplies this by 14 and the point of the
        // first run is to prove the pipeline end to end and MEASURE what a cell costs before ordering 14 of them.
        const started = Date.now();
        const res = await ythril.recall(space, { query: q.question, topK: 20 });
        const got = retrievedTurnIds(res.results);
        const want = q.evidence;
        const hit = want.filter(e => got.has(e));
        rows.push({
          rung: rung.rung,
          conversationId: conv.id,
          category: q.category,
          evidenceCount: want.length,
          allEvidence: hit.length === want.length,
          anyEvidence: hit.length > 0,
          retrieved: got.size,
          ms: Date.now() - started,
        });
        asked++;
      }
      process.stdout.write(`${asked} questions`);
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const dir = join('benchmarks', 'results', `${stamp}-tier0r`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'rows.json'), JSON.stringify(rows, null, 2));
  console.log(`\n\nwrote ${rows.length} rows to ${dir}`);
}

await main();
