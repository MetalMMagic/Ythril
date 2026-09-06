/**
 * Tier 0, stage 3 — grade the answers two ways, with the judge blind.
 *
 * Two sub-stages, because the judge here is the assistant holding the conversation and a script cannot call
 * the thing that is running it:
 *
 *   --stage sheet   reads answers.json + grading.json, writes judging.json — the question, the gold answer,
 *                   and the candidates SHUFFLED and UNLABELLED. Also writes the mapping, which the judge
 *                   never opens.
 *   --stage report  reads verdicts.json, restores the mapping, and prints both metrics side by side.
 *
 * ## The judge is blind, and what that is worth here
 *
 * The protocol requires it: answers from all systems for one question are shuffled and presented without
 * labels, so the judge cannot know which system produced which. Almost no published comparison does this.
 *
 * **It is weaker here than it would be with a separate model, and that is stated in the results rather than
 * engineered around.** The same assistant wrote the answers, so recognising its own phrasing is possible in a
 * way it would not be for an independent judge. What the shuffle still buys is that the judge cannot know
 * which SYSTEM a slot belongs to while grading it — which is the bias that actually moves a comparison — and
 * the lexical metric is reported beside every verdict precisely so a reader can see where the two disagree.
 *
 * The shuffle is seeded from the question text and the system ids, so it is reproducible: a sceptic re-running
 * this gets the same slots.
 *
 * ## Two metrics, always, because they fail in opposite directions
 *
 * Lexical F1 under-credits a correct answer worded differently — `grade/lexical.mjs` measures its own error:
 * `"7 May 2023"` against `"the seventh of May, 2023"` scores 0.57 and both are right. The judge does not have
 * that problem and has prompt sensitivity and bias instead. A claim that only survives one of them is not a
 * claim, and this file prints both rather than choosing.
 *
 * Run: node benchmarks/harness/run-tier0-grade.mjs --stage sheet --dir <dir>
 *      node benchmarks/harness/run-tier0-grade.mjs --stage report --dir <dir>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { f1 } from './grade/lexical.mjs';
import { shuffleSeedFor, shuffledOrder, parseVerdicts, RESPONSE_FORMAT } from './grade/judge.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const dir = arg('dir', '/out');
const read = f => JSON.parse(readFileSync(join(dir, f), 'utf8'));

function sheet() {
  const answers = read('answers.json');       // { items: [{ qid, answers: { system: text } }] }
  const grading = read('grading.json');
  const goldBy = new Map(grading.items.map(g => [g.qid, g.gold]));

  const sheetItems = [];
  const mapping = [];
  for (const item of answers.items) {
    const systems = Object.keys(item.answers).sort();
    const seed = shuffleSeedFor({ question: item.qid, systemIds: systems, salt: 'tier0' });
    const order = shuffledOrder(systems.length, seed);
    // `order[p]` is the index of the candidate shown in slot p — slots are 1-based in the reply format.
    const presented = order.map((idx, p) => ({ slot: p + 1, answer: item.answers[systems[idx]] ?? '' }));
    sheetItems.push({
      qid: item.qid,
      question: item.question,
      gold: goldBy.get(item.qid) ?? '',
      candidates: presented,
    });
    mapping.push({ qid: item.qid, slotToSystem: order.map((idx, p) => ({ slot: p + 1, system: systems[idx] })) });
  }

  writeFileSync(join(dir, 'judging.json'), JSON.stringify({ responseFormat: RESPONSE_FORMAT, items: sheetItems }, null, 2));
  // Written now and opened only by `report`. The judge reads `judging.json` and nothing else.
  writeFileSync(join(dir, 'mapping.json'), JSON.stringify({ items: mapping }, null, 2));
  console.log(`wrote judging.json — ${sheetItems.length} questions, candidates shuffled and unlabelled`);
}

function report() {
  const answers = read('answers.json');
  const grading = read('grading.json');
  const mapping = read('mapping.json');
  const verdicts = read('verdicts.json');   // { items: [{ qid, reply }] }

  const goldBy = new Map(grading.items.map(g => [g.qid, g.gold]));
  const mapBy = new Map(mapping.items.map(m => [m.qid, m.slotToSystem]));
  const replyBy = new Map(verdicts.items.map(v => [v.qid, v.reply]));

  const systems = [...new Set(answers.items.flatMap(i => Object.keys(i.answers)))].sort();
  const tally = new Map(systems.map(s => [s, { n: 0, f1: 0, judged: 0, correct: 0, refused: 0 }]));
  const byCategory = new Map();

  for (const item of answers.items) {
    const gold = goldBy.get(item.qid) ?? '';
    const slots = mapBy.get(item.qid) ?? [];
    let parsed = null;
    try {
      parsed = parseVerdicts(replyBy.get(item.qid) ?? '', slots.length);
    } catch (err) {
      // Named rather than skipped: an unparseable verdict is a question with no judge score, and a total that
      // quietly omits it reports a rate over a denominator nobody stated.
      console.error(`  ! ${item.qid}: ${err.message}`);
    }
    for (const { slot, system } of slots) {
      const answer = item.answers[system] ?? '';
      const t = tally.get(system);
      t.n++;
      t.f1 += f1(answer, gold);
      if (/^\s*i don't know\s*$/i.test(answer)) t.refused++;
      const v = parsed?.[slot - 1] ?? parsed?.find?.(x => x?.slot === slot);
      if (v) { t.judged++; if (v.correct) t.correct++; }

      const cat = String(item.category ?? '?');
      if (!byCategory.has(cat)) byCategory.set(cat, new Map(systems.map(s => [s, { n: 0, correct: 0, judged: 0 }])));
      const c = byCategory.get(cat).get(system);
      c.n++;
      if (v) { c.judged++; if (v.correct) c.correct++; }
    }
  }

  const pct = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');
  console.log('\n## Tier 0 — answered and judged\n');
  console.log('| system | questions | lexical F1 | judged correct | declined |');
  console.log('|---|---|---|---|---|');
  for (const s of systems) {
    const t = tally.get(s);
    console.log(`| \`${s}\` | ${t.n} | ${(t.f1 / Math.max(1, t.n)).toFixed(3)} | ${pct(t.correct, t.judged)} | ${t.refused} |`);
  }

  console.log('\n### By question category (judged correct)\n');
  console.log(`| category | ${systems.map(s => `\`${s}\``).join(' | ')} |`);
  console.log(`|---|${systems.map(() => '---').join('|')}|`);
  for (const [cat, per] of [...byCategory].sort()) {
    console.log(`| ${cat} | ${systems.map(s => pct(per.get(s).correct, per.get(s).judged)).join(' | ')} |`);
  }

  const none = tally.get('none');
  if (none) {
    console.log(`\n**Contamination control.** \`none\` was asked with no conversation at all and judged correct `
      + `${pct(none.correct, none.judged)} of the time. Every other number here should be read against that `
      + `floor: that share is recognition rather than retrieval.`);
  }
}

const stage = arg('stage', '');
if (stage === 'sheet') sheet();
else if (stage === 'report') report();
else throw new Error('--stage sheet | report');
