/**
 * The structural-window helper is tested, because twenty gates are about to trust it.
 *
 * ## Why this file exists
 *
 * `_structural-window.mjs` replaces a character count in twenty gates. A character count fails LOUDLY when it falls
 * short — the assertion inside it stops matching and the gate goes red on correct code, which is annoying and
 * visible. A broken *structural* bound fails QUIETLY: it returns a window that is too small, every assertion inside
 * it still passes on the smaller text, and twenty gates go on reporting green while checking less than they say.
 *
 * That is a strictly worse failure than the one being fixed, and it is only worse because nobody would look. So the
 * helper is asserted directly, on inputs built to break it, before anything depends on it.
 *
 * ## The cases that matter
 *
 * Not "does it find a brace" — every naive walker does. The three that separate this from the naive versions three
 * other gates hand-rolled:
 *
 *  - a bracket inside a STRING must not count (`'}'`, `"("`, a template literal);
 *  - a bracket inside a COMMENT must not count (`// }` and the block form);
 *  - an ESCAPED quote must not end the string it is in (`'it\'s'`), or everything after it is read as code.
 *
 * Each of those is a real construct in the files these gates read.
 *
 * Run: node --test testing/standalone/structural-window-helper.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  balancedFrom,
  statementFrom,
  enclosingBlockFrom,
  openTagAt,
  markdownSectionFrom,
  yamlItemAt,
  bodyOf,
  statementUpTo,
  statementAround,
  enclosingBlockAround,
  enclosingBlocksMatching,
  lineBefore,
  docCommentBefore,
  markdownSectionAround,
} from './_structural-window.mjs';

describe('balancedFrom — the bound is the matching bracket', () => {
  it('reads a whole call, including nested brackets', () => {
    const src = 'const x = call(a, inner(b, c), [1, 2]);\nconst y = 1;';
    assert.equal(balancedFrom(src, src.indexOf('call(')), '(a, inner(b, c), [1, 2])');
  });

  it('a closing bracket inside a STRING does not end the window', () => {
    // The failure mode the three hand-rolled walkers all have. A message containing a brace is ordinary in this
    // codebase — every assertion failure text is one — so this is not a theoretical input.
    const src = `assert.ok(x, 'a } and a ) in a message');\nconst next = 1;`;
    const got = balancedFrom(src, src.indexOf('assert.ok('));
    assert.ok(got.includes('in a message'), 'the window stopped at a brace inside a string literal');
    assert.ok(got.endsWith(')'));
  });

  it('a bracket inside a LINE COMMENT does not end the window', () => {
    const src = 'fn(\n  a,   // }\n  b,\n);\nconst after = 1;';
    const got = balancedFrom(src, src.indexOf('fn('));
    assert.ok(got.includes('b,'), 'the window stopped at a brace inside a comment');
  });

  it('a bracket inside a BLOCK COMMENT does not end the window', () => {
    const src = 'fn(\n  a,\n  /* ) and } */\n  b,\n);\nconst after = 1;';
    const got = balancedFrom(src, src.indexOf('fn('));
    assert.ok(got.includes('b,'), 'the window stopped at a bracket inside a block comment');
  });

  it('an ESCAPED quote does not end the string', () => {
    // If it did, the rest of the file would be scanned as code and the first stray brace would close the window.
    const src = "fn('it\\'s fine, and a ) here', last);\nconst after = 1;";
    const got = balancedFrom(src, src.indexOf('fn('));
    assert.ok(got.includes('last'), 'an escaped quote ended the string and the window closed early');
  });

  it('a template literal is skipped like any other string', () => {
    const src = 'fn(`a } and a ) inside`, last);\nconst after = 1;';
    assert.ok(balancedFrom(src, src.indexOf('fn(')).includes('last'));
  });

  it('anchors on a BLOCK when pointed at its brace', () => {
    const src = 'if (!range) {\n  process.exit(1);\n}\nconst after = 1;';
    const got = balancedFrom(src, src.indexOf('{'));
    assert.ok(got.startsWith('{') && got.endsWith('}'));
    assert.ok(got.includes('process.exit(1)'));
  });

  it('says so rather than returning a short window when the group never closes', () => {
    // The whole point. An unbounded window must be an error, never a silently smaller subject.
    assert.throws(() => balancedFrom('fn(a, b', 0), /never closed/);
    assert.throws(() => balancedFrom('no brackets here', 0), /no bracket/);
  });
});

describe('statementFrom — the bound is the terminator', () => {
  it('reaches the semicolon past nested calls and strings', () => {
    const src = "const s = z.object({ a: 1 }).strict();\nconst t = 2;";
    const got = statementFrom(src, src.indexOf('z.object('));
    assert.ok(got.includes('.strict()'), 'a nested object hid the end of the statement');
    assert.ok(got.endsWith(';'));
  });

  it('a semicolon inside a string is not the end', () => {
    const src = "fn('a ; here');\nconst after = 1;";
    assert.ok(statementFrom(src, 0).includes('here'));
  });

  it('works from the MIDDLE of an expression, where depth goes negative', () => {
    /*
     * The case that made this unusable. The walk starts at the anchor, so brackets opened BEFORE it close into
     * negative depth: `endsAt` inside `{ endsAt: z.string() }` reaches its `;` at relative depth -2. Requiring
     * exactly 0 reported "no statement terminator" on ordinary code, and a gate converted to use it failed.
     */
    const src = 'const S = z.object({ endsAt: z.string().optional() });\nconst after = 1;';
    const got = statementFrom(src, src.indexOf('endsAt'));
    assert.ok(got.endsWith(';'));
    assert.ok(!got.includes('const after'), 'it ran past the end of the statement');
  });

  it('and from inside a nested block', () => {
    const src = 'fn(() => {\n  if (a.endsAt < a.startsAt) throw new Error("no");\n});\n';
    const got = statementFrom(src, src.indexOf('endsAt'));
    assert.ok(got.includes('startsAt'), 'the rest of the comparison is outside the window');
    assert.ok(got.endsWith(';'));
  });

  it('a missing terminator is an error, not a short window', () => {
    assert.throws(() => statementFrom('const x = 1', 0), /no statement terminator/);
  });
});

describe('statementUpTo — the bound behind an anchor is where its statement starts', () => {
  it('THE case that broke the first version: an options object is not a statement boundary', () => {
    /*
     * Taking the nearest `;`, `{` or `}` at any depth makes the closing brace of the options object the boundary,
     * so the window starts at `) : await ` — and the gate that asks "is this fetch behind a locality test?"
     * answers no about a fetch that plainly is. Found by running the converted gate, not by reasoning.
     */
    const src = [
      '  let res;',
      '  try {',
      '    res = endpoint.external',
      '      ? await ssrfSafeFetch(url, init, { allowPrivate: allowPrivateForSlot(endpoint.slot) })',
      '      : await fetch(url, init);',
      '  } catch (err) { throw err; }',
    ].join('\n');
    const at = src.lastIndexOf('fetch(url, init)');
    const got = statementUpTo(src, at);
    assert.ok(got.includes('endpoint.external'), 'the locality test is outside the window');
    assert.ok(!got.includes('let res'), 'the window ran back past the start of the statement');
  });

  it('a preceding statement ends the window', () => {
    const src = 'const a = 1;\nconst b = choose ? one() : two();';
    const got = statementUpTo(src, src.indexOf('two()'));
    assert.ok(got.includes('choose'));
    assert.ok(!got.includes('const a'), 'the previous statement is inside the window');
  });

  it('a semicolon inside a nested arrow does not end the outer statement', () => {
    const src = 'const f = flag\n  ? (x) => { return g(x); }\n  : (x) => h(x);';
    const got = statementUpTo(src, src.indexOf('h(x)'));
    assert.ok(got.includes('flag'), 'a nested block ended the statement early');
  });

  it('a semicolon in a string is not a boundary', () => {
    const src = "const msg = 'a ; here';\nconst v = flag ? a() : b();";
    assert.ok(statementUpTo(src, src.indexOf('b()')).includes('flag'));
  });

  it('grows with the statement, which is the whole point', () => {
    const base = 'const v = someVeryLongCondition\n  ? a()\n  : b();';
    const grown = base.replace('someVeryLongCondition', 'someVeryLongCondition /* ' + 'x'.repeat(800) + ' */');
    assert.ok(statementUpTo(grown, grown.lastIndexOf('b()')).includes('someVeryLongCondition'));
  });
});

describe('statementAround — safe when the anchor is inside a string', () => {
  it('THE case that broke the composed version: a quoted FIELD NAME', () => {
    /*
     * `statementUpTo(at) + statementFrom(at)` looks equivalent and is not. `statementFrom` starts walking AT the
     * anchor, so when the anchor is inside `'endsAt'` it reads that string's own closing quote as an OPENING one,
     * desynchronises quote parity for the rest of the file, and reports "no statement terminator" on ordinary code.
     *
     * This is not a contrived input: any gate matching an identifier that also appears as a quoted field name hits
     * it, and one did — the chrono source lists `'startsAt', 'endsAt'` in an array of updatable fields.
     */
    const src = "const FIELDS = [\n  'title', 'startsAt', 'endsAt', 'status',\n];\nconst after = 1;";
    const got = statementAround(src, src.indexOf("endsAt"));
    assert.ok(got.includes('FIELDS'), 'it did not reach the start of the statement');
    assert.ok(got.trimEnd().endsWith(';'), 'it did not reach the end of the statement');
    assert.ok(!got.includes('const after'), 'it ran past the statement');
  });

  it('returns the whole statement from an anchor in the middle of real code', () => {
    const src = 'const a = 1;\nif (rec.endsAt < rec.startsAt) throw new Error("out of order");\nnext();';
    const got = statementAround(src, src.indexOf('endsAt'));
    assert.ok(got.includes('startsAt'));
    assert.ok(!got.includes('const a'), 'it ran back past the statement');
    assert.ok(!got.includes('next()'), 'it ran forward past the statement');
  });
});

describe('enclosingBlockFrom — the bound is the brace that closes what you are inside', () => {
  it('returns the rest of the branch the anchor sits in', () => {
    const src = 'if (deep) {\n  counter++;\n  log.warn(`DROPPED ${id}`);\n}\nnext();';
    const got = enclosingBlockFrom(src, src.indexOf('counter++'));
    assert.ok(got.includes('DROPPED'), 'the rest of the branch was not covered');
    assert.ok(!got.includes('next()'), 'the window ran past the end of the branch');
  });

  it('nested blocks inside the branch do not end it early', () => {
    const src = 'if (a) {\n  if (b) { inner(); }\n  tail();\n}\nafter();';
    const got = enclosingBlockFrom(src, src.indexOf('if (b)'));
    assert.ok(got.includes('tail()'), 'a nested block closed the window');
    assert.ok(!got.includes('after()'));
  });

  it('a brace in a message does not end the branch', () => {
    const src = "if (a) {\n  fail('} not real');\n  tail();\n}\nafter();";
    assert.ok(enclosingBlockFrom(src, src.indexOf('fail(')).includes('tail()'));
  });
});

describe('openTagAt — the bound for an assertion about attributes', () => {
  it('returns exactly the opening tag', () => {
    const src = '<div class="tabs" role="tablist" aria-label="Brain views">\n  <button>x</button>\n</div>';
    const got = openTagAt(src, src.indexOf('<div'));
    assert.ok(got.startsWith('<div') && got.endsWith('>'));
    assert.ok(got.includes('aria-label'), 'a long attribute list was cut');
    assert.ok(!got.includes('<button'), 'the window ran into the children');
  });

  it('an attribute added at the end is still inside the window', () => {
    // The Space Admin failure in one line: a fifth column pushed the subject past a character count. Here the
    // subject grows and the bound grows with it.
    const grown = '<div class="tabs" role="tablist" aria-label="x" data-extra="' + 'y'.repeat(500) + '">';
    assert.ok(openTagAt(grown, 0).includes('data-extra'));
  });
});

describe('markdownSectionFrom — prose is bounded by the next heading', () => {
  const doc = '# Title\n\nWorks fully offline. Enforced with HF_HUB_OFFLINE=1.\n\n## Next\n\nSomething else.\n';

  it('covers the claim and everything said about it', () => {
    const got = markdownSectionFrom(doc, doc.indexOf('Works fully offline'));
    assert.ok(got.includes('HF_HUB_OFFLINE'));
    assert.ok(!got.includes('Something else'), 'the window ran into the next section');
  });

  it('a section at the end of the document is not cut', () => {
    const got = markdownSectionFrom(doc, doc.indexOf('Something else'));
    assert.ok(got.includes('Something else'));
  });

  it('grows with the prose', () => {
    const padded = doc.replace('Enforced', 'Padding. '.repeat(300) + 'Enforced');
    assert.ok(markdownSectionFrom(padded, padded.indexOf('Works fully offline')).includes('HF_HUB_OFFLINE'));
  });
});

describe('yamlItemAt — a workflow step is bounded by the next step', () => {
  const wf = [
    'jobs:',
    '  check:',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '        with:',
    '          fetch-depth: 0',
    '      - name: next step',
    '        run: echo hi',
  ].join('\n');

  it('covers the whole step, not a count of it', () => {
    const got = yamlItemAt(wf, wf.indexOf('actions/checkout@v4'));
    assert.ok(got.includes('fetch-depth: 0'));
    assert.ok(!got.includes('next step'), 'the window ran into the following step');
  });

  it('an anchor on a LATER line of the step still bounds the whole step', () => {
    const got = yamlItemAt(wf, wf.indexOf('fetch-depth'));
    assert.ok(got.includes('actions/checkout@v4'), 'it did not walk back to the start of the item');
  });

  it('grows when the step gains keys', () => {
    const grown = wf.replace('          fetch-depth: 0', '          fetch-depth: 0\n          persist-credentials: false');
    const got = yamlItemAt(grown, grown.indexOf('actions/checkout@v4'));
    assert.ok(got.includes('persist-credentials'));
    assert.ok(!got.includes('next step'));
  });

  it('a blank line inside a step does not end it', () => {
    const spaced = wf.replace('        with:', '\n        with:');
    assert.ok(yamlItemAt(spaced, spaced.indexOf('actions/checkout@v4')).includes('fetch-depth'));
  });
});

describe('enclosingBlockAround — the block you are in, plus the line that let you in', () => {
  it('includes the CONDITION, not just the braces', () => {
    // The question is "what guarded this?", and the guard is the condition. Bounding at the brace would answer a
    // different question and answer it correctly, which is the worst kind of wrong.
    const src = 'fn();\nif (failed.length === 0) {\n  log.info("readiness confirmed for all");\n}\nafter();';
    const got = enclosingBlockAround(src, src.indexOf('readiness confirmed'));
    assert.ok(got.includes('failed.length === 0'), 'the condition is outside the window');
    assert.ok(!got.includes('after()'), 'the window ran past the block');
    assert.ok(!got.includes('fn()'), 'the window ran back past the block');
  });

  it('finds a try/catch wrapping a call', () => {
    const src = 'a();\ntry {\n  chmodSync(target, mode);\n} catch { /* best effort */ }\nb();';
    const got = enclosingBlockAround(src, src.indexOf('chmodSync'));
    assert.ok(/try\s*\{/.test(got), 'the try is outside the window');
  });

  it('a nested block does not become the answer', () => {
    const src = 'if (outer) {\n  if (inner) { x(); }\n  target();\n}\n';
    const got = enclosingBlockAround(src, src.indexOf('target()'));
    assert.ok(got.includes('outer'), 'it picked a sibling block instead of the enclosing one');
  });

  it('grows with the block, which a count cannot', () => {
    const pad = '  filler();\n'.repeat(200);
    const src = `if (guardCondition) {\n${pad}  target();\n}\n`;
    assert.ok(enclosingBlockAround(src, src.indexOf('target()')).includes('guardCondition'));
  });
});

describe('enclosingBlocksMatching — containment, which is NOT proximity', () => {
  const OPENER = /@if\s*\(/;

  it('THE case a backwards window gets wrong: a guard that already CLOSED does not count', () => {
    /*
     * This is why the nine backwards windows were not swept blind. `src.slice(at - 600, at)` finds the text of a
     * guard that opened and closed above the control and calls the control guarded. It is not — the guard contains
     * nothing. A proximity measurement cannot answer a containment question, and here the false answer is "this
     * form control is locked when the instance is managed" about one that is not.
     */
    const src = [
      '@if (!(s.faceLocked("x") || s.managed)) {',
      '  <input id="guarded" [(ngModel)]="a" />',
      '}',
      '<input id="exposed" [(ngModel)]="b" />',
    ].join('\n');

    const guarded = enclosingBlocksMatching(src, src.indexOf('id="guarded"'), OPENER);
    assert.equal(guarded.length, 1, 'the control inside the guard was not seen as contained');
    assert.match(guarded[0], /managed/);

    const exposed = enclosingBlocksMatching(src, src.indexOf('id="exposed"'), OPENER);
    assert.deepEqual(exposed, [], 'a guard that closed above the control was counted as containing it');
  });

  it('reports nesting outermost first', () => {
    const src = '@if (a) {\n  @if (b) {\n    <input id="deep" />\n  }\n}';
    const got = enclosingBlocksMatching(src, src.indexOf('id="deep"'), OPENER);
    assert.equal(got.length, 2);
    assert.match(got[0], /\(a\)/);
    assert.match(got[1], /\(b\)/);
  });

  it('a condition containing its own parens is not truncated', () => {
    // `[^)]*` stopped at the first `)`, so `s.faceLocked('…')` closed before `managed` was reached and the guard
    // read as absent. The whole opening line is returned, so there is nothing to truncate.
    const src = '@if (!(s.faceLocked("personEntityTypes") || s.managed)) {\n  <input id="x" />\n}';
    const got = enclosingBlocksMatching(src, src.indexOf('id="x"'), OPENER);
    assert.equal(got.length, 1);
    assert.ok(got[0].includes('managed'), 'the condition was cut at an inner paren');
  });
});

describe('lineBefore — for a marker whose rule is literally "immediately above"', () => {
  it('returns the last non-empty line, skipping blanks', () => {
    const doc = '**Response**\n\n```json\n{"tokens": []}\n```\n';
    assert.equal(lineBefore(doc, doc.indexOf('```json')), '**Response**');
  });

  it('does not reach past it to an earlier marker', () => {
    const doc = '**Response**\n\nSome prose.\n\n```json\n{}\n```\n';
    assert.equal(lineBefore(doc, doc.indexOf('```json')), 'Some prose.');
  });
});

describe('docCommentBefore — the comment block above a declaration', () => {
  const src = '/** Machine-managed: not meant to be hand-edited. */\n  sync?: SyncConfig;\n';

  it('returns the comment', () => {
    const got = docCommentBefore(src, src.indexOf('sync?:'));
    assert.ok(got.includes('hand-edited'));
    assert.ok(got.startsWith('/*') && got.endsWith('*/'));
  });

  it('returns EMPTY when code separates the comment from the anchor', () => {
    // An absent doc comment is an answer a gate asserts on. Throwing would make it look like a broken anchor.
    const other = '/** About something else. */\nconst x = 1;\n  sync?: SyncConfig;\n';
    assert.equal(docCommentBefore(other, other.indexOf('sync?:')), '');
  });

  it('returns EMPTY when there is no comment at all', () => {
    assert.equal(docCommentBefore('  sync?: SyncConfig;\n', 2), '');
  });

  it('grows with the comment', () => {
    const grown = src.replace('Machine-managed', 'Machine-managed. ' + 'More prose. '.repeat(200));
    assert.ok(docCommentBefore(grown, grown.indexOf('sync?:')).includes('hand-edited'));
  });
});

describe('markdownSectionAround — the section a MENTION belongs to', () => {
  const notice = '## A\n\nLicence: MIT\n\nwhisper-small is bundled.\n\n## B\n\nNo licence here.\n';

  it('reaches backwards to the section heading, which is where the licence is', () => {
    // The half `markdownSectionFrom` cannot see: the model is mentioned after the licence line, so bounding
    // forward from the mention finds nothing and reports an attributed model as unattributed.
    const got = markdownSectionAround(notice, notice.indexOf('whisper-small'));
    assert.ok(/Licen[cs]e:/.test(got), 'the licence above the mention is outside the window');
    assert.ok(!got.includes('No licence here'), 'the window ran into the next section');
  });

  it('does not leak the PREVIOUS section in', () => {
    const got = markdownSectionAround(notice, notice.indexOf('No licence here'));
    assert.ok(!/Licen[cs]e: MIT/.test(got), 'a licence from another section would be read as this one\'s');
  });
});

describe('bodyOf still behaves, since the new code shares its module', () => {
  it('bounds a declaration by the next one', () => {
    const src = 'export function a() {\n  return 1;\n}\n\nexport function b() {\n  return 2;\n}\n';
    const got = bodyOf(src, 'a');
    assert.ok(got.includes('return 1'));
    assert.ok(!got.includes('return 2'));
  });
});
