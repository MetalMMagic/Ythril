/**
 * A DIAGNOSTIC, not a gate: find test cases whose TITLE claims a whole set while their BODY loops over an
 * inline array literal.
 *
 * ## Why it is not a gate, and must not become one without a lot more work
 *
 * It cannot tell the defect from the legitimate case, and the legitimate case is the majority. A loop over
 * enumerated VALUES — cron shorthands, malformed env values, the four `freq` words — is not this defect and
 * never will be. The defect is an array that COPIES a set the source defines: record types, collections,
 * schemas, routers, tool names. Nothing here can distinguish those without knowing what the array means.
 *
 * Wired as a gate it would be ~100 failures on a clean tree, and `CLAUDE.md` already says what happens next:
 * noise is how a check gets deleted. So this prints suspicions for a person to read.
 *
 * ## What it is for
 *
 * `Q-5` found this class four times in one audit and `CLAUDE.md` gained a section for it. Turning that rule
 * into a search rather than waiting to trip over the next instance is what found the two `Q-6` starts from —
 * and one of those had been wrong since long before the audit's scope began.
 *
 * The shape to look for in the output: does the array enumerate something the CODE also enumerates? If yes,
 * the two will disagree eventually and the title is what makes the disagreement invisible.
 *
 * Run: node scripts/scan-set-claiming-gates.mjs
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// `git ls-files` rather than a directory walk: a gitignored file is not part of this repo's suite, and
// reading one would report a suspicion nobody can act on.
const files = execFileSync('git', ['ls-files', 'testing'], { encoding: 'utf8' })
  .split('\n').map(s => s.trim()).filter(f => f.endsWith('.test.js'));

/** Words that make a title a claim about a whole set rather than about one case. */
const CLAIMS = /\b(every|all|each|no|nothing|never|any)\b/i;

/** `for (const x of ['a', …])` — the loop that makes the body narrower than the title. */
const LITERAL_LOOP = /for\s*\(\s*const\s*(?:\[[^\]]*\]|\w+)\s+of\s*\[\s*['"`]/;

const hits = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const m = /^\s*it\(\s*['"`](.+?)['"`]/.exec(line);
    if (!m || !CLAIMS.test(m[1])) return;
    // The case body, to the next `it(`/`describe(` or a 90-line cap — long enough for the docblocks this
    // repo writes, short enough not to swallow the following case.
    let end = i + 1;
    while (end < lines.length && end < i + 90 && !/^\s{2,4}(it|describe)\(/.test(lines[end])) end++;
    const body = lines.slice(i, end).join('\n');
    const loop = LITERAL_LOOP.exec(body);
    if (!loop) return;
    hits.push(`${file}:${i + 1}\n    TITLE: ${m[1]}\n    LOOP : ${body.slice(loop.index).split('\n')[0].trim()}`);
  });
}

console.log(hits.join('\n\n') || 'no suspicions');
console.log(`\n${hits.length} suspicion(s) over ${files.length} test files — SUSPICIONS, not findings.`);
console.log('Read each: an array of VALUES is fine, an array copying a set the source defines is not.');
