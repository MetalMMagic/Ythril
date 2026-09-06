/**
 * Tier 0, stage 1 — retrieve the context and write the answering sheet.
 *
 * ## Why this tier is split into stages at all
 *
 * The protocol's Tier 0 adds an answerer and a judge to the retrieval Tier 0-R already measures. Normally
 * both are API models and the whole run is one script. Here the answerer and the judge are **the assistant
 * holding this conversation**, at the owner's direction — which costs nothing and cannot be scripted, because
 * a script cannot call the thing that is running it.
 *
 * So the run is three files instead of one function: export, answer, grade.
 *
 * ## THE FILE SPLIT IS THE METHOD, not a convenience
 *
 * This writes **two** files:
 *
 *   - `answering.json` — the questions and the retrieved context. **No gold answers, anywhere in it.**
 *   - `grading.json`   — the gold answers, opened only at grading time.
 *
 * An answerer that has seen the answer key is not measuring retrieval, and with a human-shaped answerer there
 * is no API boundary enforcing that — the separation has to be structural or it is not real. It mirrors the
 * rule the ingest stage already lives under: `benchmark-ingest-cannot-see-the-questions.test.js` exists for
 * the same reason one file up the pipeline.
 *
 * ## What is asked, and of what
 *
 * Three candidates per question, which is also what makes the blind judging work:
 *
 *   1. `s0`  — turns as memories, no links. The control the published floor was measured on.
 *   2. `s0l` — turns as memories linked to their session, walked with `includeMemories`. The rung under test.
 *   3. `none` — no context at all. **The protocol's Control 1**, and with this answerer it is the important
 *      one: LoCoMo has been public since 2024, so anything answered correctly with no conversation in front
 *      of it is recognition rather than retrieval, and every headline number is reported beside it.
 *
 * Run: node benchmarks/harness/run-tier0-export.mjs --base-url … --token … --data … [--questions 30]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConversations, loadQuestions } from './dataset/locomo.mjs';
import { makeYthril } from './ythril.mjs';
import { stratifiedSample } from './sample.mjs';
import * as s0 from './ingest/s0-raw-turns.mjs';
import * as s0l from './ingest/s0l-linked-memories.mjs';

/** The systems compared, in a fixed order. `none` retrieves nothing and is the contamination control. */
const SYSTEMS = [
  { id: 's0', rung: s0, traverse: 0 },
  { id: 's0l', rung: s0l, traverse: 2 },
  { id: 'none', rung: null, traverse: 0 },
];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/**
 * The retrieved records as the answerer's context — one format for every system.
 *
 * Identical formatting is what keeps the comparison about retrieval: a system whose context is easier to read
 * would score better for a reason that is not its retriever. Turn id included so a reader of the transcript
 * can check an answer against the evidence by hand.
 */
function asContext(results) {
  const lines = [];
  const walk = (r, depth) => {
    const text = r?.fact ?? r?.name ?? r?.title ?? '';
    const turn = r?.properties?.turn;
    if (text) lines.push(`${'  '.repeat(depth)}[${turn ?? '—'}] ${text}`);
    for (const g of r?._graph ?? []) walk(g.node ?? g, depth + 1);
  };
  for (const r of results ?? []) walk(r, 0);
  return lines.join('\n');
}

async function main() {
  const baseUrl = arg('base-url', 'http://bench-ythril:3200');
  const token = arg('token', process.env['YTHRIL_TOKEN'] ?? '');
  const dataPath = arg('data', '');
  const nQuestions = Number(arg('questions', '30'));
  const seed = Number(arg('seed', '1'));
  const outDir = arg('out', '/out');
  if (!token) throw new Error('--token or YTHRIL_TOKEN required');
  if (!dataPath) throw new Error('--data required — the pinned LoCoMo path');

  const ythril = makeYthril({ baseUrl, token });
  const conversations = await loadConversations(dataPath);
  const byId = new Map(conversations.map(c => [c.id, c]));
  const questions = await loadQuestions(dataPath);
  const answerable = questions.filter(q => (q.evidence ?? []).length > 0);

  /*
   * The SAME sampler and the SAME seed as Tier 0-R, so these questions are a subset of the ones whose
   * retrieval numbers are already published. A different sample would make the two tiers incomparable while
   * looking like they were about the same thing.
   */
  const sample = stratifiedSample(answerable, nQuestions, seed);

  const answering = [];
  const grading = [];
  let asked = 0;

  for (const q of sample) {
    if (!byId.has(q.conversationId)) continue;
    const candidates = [];
    for (const sys of SYSTEMS) {
      if (sys.rung === null) {
        candidates.push({ system: sys.id, context: '' });
        continue;
      }
      const space = `bench-${sys.rung.rung.replace('+', 'plus')}-${q.conversationId}`.toLowerCase();
      const res = await ythril.recall(space, {
        query: q.question,
        topK: 20,
        ...(sys.rung.recallTypes ? { types: sys.rung.recallTypes } : {}),
        ...(sys.traverse > 0
          ? { traverse: { depth: sys.traverse, ...(sys.rung.traverseExtra ?? {}) } }
          : {}),
      });
      candidates.push({
        system: sys.id,
        context: asContext(res.results),
        records: (res.results ?? []).length,
        graphNodes: res.graphNodes ?? 0,
      });
    }
    answering.push({ qid: `${q.conversationId}#${asked}`, question: q.question, category: q.category, candidates });
    grading.push({ qid: `${q.conversationId}#${asked}`, gold: q.answer ?? q.adversarialAnswer ?? '', evidence: q.evidence });
    asked++;
    process.stdout.write(`\rretrieved ${asked}/${sample.length}`);
  }

  mkdirSync(outDir, { recursive: true });
  // Written separately and named so that opening the wrong one is a deliberate act rather than an accident.
  writeFileSync(join(outDir, 'answering.json'), JSON.stringify({ systems: SYSTEMS.map(s => s.id), items: answering }, null, 2));
  writeFileSync(join(outDir, 'grading.json'), JSON.stringify({ items: grading }, null, 2));
  console.log(`\nwrote ${answering.length} questions × ${SYSTEMS.length} systems`);
  console.log(`  answering.json  — questions and context, NO gold answers`);
  console.log(`  grading.json    — gold answers, opened at grading time only`);
}

main().catch(err => { console.error(err); process.exit(1); });
