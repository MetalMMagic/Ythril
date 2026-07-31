/**
 * The bench parser fails LOUDLY, and its fixture is invented.
 *
 * ## Why the fixture is synthetic
 *
 * The real labelled set is drawn from production records — architecture decisions, alert history,
 * cluster configuration — and this repository is public. So the data lives outside the worktree
 * entirely, `assertDataPathIsOutsideRepo` refuses a path inside it before reading a byte, and every
 * fixture here is written for the test.
 *
 * ## Why loudness is the property under test
 *
 * The bench is authored and reviewed as prose, because the "why this pair is hard" column is the most
 * valuable part of it and only stays accurate if a human edits it as a document. That trade is safe only
 * while parsing failures are impossible to miss: a parser that silently found three pairs would
 * benchmark three pairs and report a confident number for a different question. Every guard below exists
 * to turn a format drift into an error rather than a smaller sample.
 *
 * Run: node --test testing/standalone/bench-pairs-parser.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

const {
  parseBenchSource, extractTexts, extractPairs, shouldMerge, LABELS,
  assertDataPathIsOutsideRepo,
} = await import('../bench/parse-bench-pairs.mjs');

/** A miniature bench file. Nothing here resembles any real record. */
const FIXTURE = [
  '# Fixture bench',
  '',
  '| # | A | B | Label | Why |',
  '| --- | --- | --- | --- | --- |',
  '| 1 | X-0001 | S-X-0001 | `duplicate` | translated |',
  '| 2 | X-0001 | X-0002 | `distinct` | different subjects |',
  '| B1 | Y-AAA | Y-BBB | `recurrence` | same condition, later |',
  '',
  '## Texts',
  '',
  '### X-0001',
  '',
  '> **Widget alpha** · thing · value `4px`',
  '> The first widget. It is four pixels.',
  '',
  '### X-0002',
  '',
  '> **Widget beta** · thing · value `8px`',
  '> The second widget. It is eight pixels.',
  '',
  '### S-X-0001 — invented translation of X-0001',
  '',
  '> **Widget alpha** · Ding · Wert `4px`',
  '> Das erste Widget. Es ist vier Pixel gross.',
  '',
  '### Y-AAA *(synthetic)*',
  '',
  '> **ThingHappened on host-one** · episode · `startsAt 2020-01-01T00:00:00Z`',
  '> A thing happened.',
  '',
  '### Y-BBB',
  '',
  '> **ThingHappened on host-one** · episode · `startsAt 2020-01-14T00:00:00Z`',
  '> A thing happened.',
  '',
].join('\n');

describe('parsing a well-formed file', () => {
  const { pairs, texts } = parseBenchSource(FIXTURE, { expectedPairs: 3 });

  it('finds every pair', () => assert.equal(pairs.length, 3));

  it('reads the label out of the backticks', () => {
    assert.deepEqual(pairs.map(p => p.label), ['duplicate', 'distinct', 'recurrence']);
  });

  it('assigns a block from the id prefix', () => {
    assert.deepEqual(pairs.map(p => p.block), ['A', 'A', 'B']);
  });

  it('resolves every referenced text', () => {
    for (const p of pairs) {
      assert.ok(texts.has(p.a), `${p.id}: ${p.a}`);
      assert.ok(texts.has(p.b), `${p.id}: ${p.b}`);
    }
  });

  it('strips blockquote, bold and code markers from the body', () => {
    const t = texts.get('X-0001');
    assert.doesNotMatch(t, /^>/m);
    assert.doesNotMatch(t, /\*\*/);
    assert.doesNotMatch(t, /`/);
    assert.match(t, /Widget alpha/);
    assert.match(t, /four pixels/);
  });

  it('collapses the record to one line, the shape the system embeds', () => {
    assert.doesNotMatch(texts.get('X-0001'), /\n/);
  });

  it('accepts a heading with a description or a suffix after the id', () => {
    // `### S-X-0001 — invented translation of X-0001` and `### Y-AAA *(synthetic)*`. An earlier version
    // required an em-dash clause and silently skipped the second form, which surfaced as "pair
    // references have no text" pointing at the table — the wrong place to look.
    assert.ok(texts.has('S-X-0001'));
    assert.ok(texts.has('Y-AAA'));
  });
});

describe('CRLF', () => {
  it('parses identically to LF', () => {
    // The real file is authored on Windows. Every `$`-anchored pattern fails against the trailing `\r`
    // while unanchored ones still match — so the pair table parsed perfectly and every appendix heading
    // was skipped, surfacing as "8 pair references have no text".
    const crlf = FIXTURE.replace(/\n/g, '\r\n');
    const a = parseBenchSource(FIXTURE, { expectedPairs: 3 });
    const b = parseBenchSource(crlf, { expectedPairs: 3 });
    assert.deepEqual(b.pairs, a.pairs);
    assert.deepEqual([...b.texts.entries()], [...a.texts.entries()]);
  });
});

describe('failing loudly rather than measuring a subset', () => {
  it('a pair count that does not match is an error', () => {
    assert.throws(
      () => parseBenchSource(FIXTURE, { expectedPairs: 40 }),
      /Parsed 3 pairs, expected 40/,
    );
  });

  it('an unreferenced text is fine; an unresolvable reference is not', () => {
    const broken = FIXTURE.replace('### X-0002\n', '### X-9999\n');
    assert.throws(() => parseBenchSource(broken, { expectedPairs: 3 }), /have no text in the appendix/);
    assert.throws(() => parseBenchSource(broken, { expectedPairs: 3 }), /X-0002/);
  });

  it('an unknown label is an error, not a silently dropped row', () => {
    const broken = FIXTURE.replace('`distinct`', '`probably-fine`');
    assert.throws(() => extractPairs(broken), /Unknown label 'probably-fine'/);
  });

  it('the table separator row is not mistaken for a pair', () => {
    assert.equal(extractPairs('| --- | --- | --- | --- | --- |').length, 0);
  });

  it('prose containing pipes is not mistaken for a pair', () => {
    assert.equal(extractPairs('| a | b | c | d | e |').length, 0);
  });

  it('an empty document parses to nothing rather than throwing', () => {
    const { pairs, texts } = parseBenchSource('', {});
    assert.equal(pairs.length, 0);
    assert.equal(texts.size, 0);
  });
});

describe('which labels may merge', () => {
  it('only duplicate', () => {
    assert.equal(shouldMerge('duplicate'), true);
    for (const l of ['subsumes', 'supersedes', 'recurrence', 'distinct', 'contradicts']) {
      assert.equal(shouldMerge(l), false, l);
    }
  });

  it('recurrence in particular must NOT merge', () => {
    // The finding that shapes the whole design: two alert episodes can be byte-identical and must both
    // survive, because in an operations log the second occurrence IS the information. No text-based
    // score can separate that from a true duplicate — only structured fields can.
    assert.equal(LABELS.recurrence.merge, false);
    assert.match(LABELS.recurrence.note, /occurrence/);
  });

  it('an unknown label never merges', () => {
    assert.equal(shouldMerge('made-up'), false);
  });
});

describe('the data may not live in this repository', () => {
  const repoRoot = process.cwd();

  it('refuses a path inside the worktree', () => {
    assert.throws(
      () => assertDataPathIsOutsideRepo(path.join(repoRoot, 'bench-data', 'pairs.md'), repoRoot),
      /Refusing to read bench data from inside the repository/,
    );
  });

  it('refuses the repo root itself', () => {
    assert.throws(() => assertDataPathIsOutsideRepo(path.join(repoRoot, 'pairs.md'), repoRoot), /Refusing/);
  });

  it('allows a sibling directory outside it', () => {
    const outside = path.join(repoRoot, '..', '_private', 'pairs.md');
    assert.equal(assertDataPathIsOutsideRepo(outside, repoRoot), path.resolve(outside));
  });

  it('is not fooled by a traversal that lands back inside', () => {
    const sneaky = path.join(repoRoot, '..', path.basename(repoRoot), 'pairs.md');
    assert.throws(() => assertDataPathIsOutsideRepo(sneaky, repoRoot), /Refusing/);
  });
});
