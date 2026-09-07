/**
 * No upstream response body may be read without a size ceiling.
 *
 * ## The finding
 *
 * `boundedJson` was written in `files/media/providers.ts` with the risk stated correctly in a comment —
 * *"`fetch().json()` reads the entire body without limit → a hostile or runaway upstream could exhaust heap"* —
 * and then used at **three call sites, all inside that same file**. Twelve other `Response.json()` reads across
 * eight files were unbounded, including `files/converters/renderer.ts`, which reads rendered page images as
 * base64 strings and decodes each one, making it the largest JSON body the server handles.
 *
 * ## Why nobody noticed, which is the part this gate is really for
 *
 * **Every one of those call sites already had a timeout.** An audit sweep asked "is there a provider call with no
 * timeout?", found none, and moved on. A timeout bounds **duration**; it says nothing about **size**. A fast
 * upstream streaming gigabytes finishes well inside a 120-second budget.
 *
 * The realistic failure is **runaway, not hostile** — every upstream is operator-configured. `renderDpi` accepts
 * up to 600 and `maxPages` up to 2000 through the UI, so no bug and no attacker is needed.
 *
 * ## Sizing, checked rather than assumed
 *
 * The two untruncated error bodies do **not** reach an API client: the global error middleware in `app.ts`
 * returns a literal `'Internal server error'` and never `err.message`, and the four route handlers that do return
 * `err.message` wrap Mongo/config/keypair work that no upstream body can reach. So that half is a log-quality and
 * double-allocation problem, not an information leak — stated because the tracker entry had it filed as possibly
 * either, and guessing would have justified a larger change than the evidence supports.
 *
 * Run: node --test testing/standalone/upstream-reads-are-bounded.test.js
 * (requires a prior `npm run build` in server/)
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { trackedSources } from './_sources.mjs';

const ROOT = process.cwd();
const HELPER = 'server/src/util/bounded-read.ts';

let mod;
before(async () => { mod = await import('../../server/dist/util/bounded-read.js'); });

/**
 * Every .ts under server/src that is part of the repo — tracked **and** untracked-but-not-ignored.
 *
 * A plain `git ls-files` cannot see a file added in the same change as the gate, so on its first run this
 * scan missed the very helper it points at. That is how it failed the first time it was run, and it is the
 * third time this repo has been bitten by treating `git ls-files` as "what files does this project have".
 *
 * `untracked: true` is that paragraph, said at the call. The default listing answers *"what does the
 * repository hold"*; this gate asks what is on disk right now. Both questions go through one module, so the
 * two gates needing the second one no longer each carry their own copy of the incantation — and the flag is
 * visible at the call site, which a copy never was.
 */
function sourceFiles() {
  return trackedSources('server/src', { untracked: true, floor: 50 });
}

/** Strip comments line-first so the gate cannot fire on the prose explaining it. */
function code(path) {
  return readFileSync(join(ROOT, path), 'utf8')
    .split(/\r?\n/)
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
}

describe('the gate: every upstream read goes through a bounded reader', () => {
  it('found a plausible number of files — the scan itself still works', () => {
    const files = sourceFiles();
    assert.ok(files.length > 50, `only ${files.length} source files found; the enumeration broke, not the code`);
    assert.ok(files.includes(HELPER), `${HELPER} is not tracked, so the helper this gate points at is missing`);
  });

  it('no Response.json() is called outside the helper', () => {
    const offenders = [];
    for (const f of sourceFiles()) {
      if (f === HELPER) continue;
      const src = code(f);
      // `.json()` on a fetch Response. Mongo/Express have no such method, so this pattern is specific.
      for (const m of src.matchAll(/\bawait\s+\w+\.json\(\)/g)) {
        offenders.push(`${f}: ${m[0]}`);
      }
    }
    assert.deepEqual(offenders, [], 'these read an entire upstream body into memory with no ceiling. A timeout '
      + 'does not help — it bounds duration, not size.\n  ' + offenders.join('\n  ')
      + "\n\nUse `boundedJson<T>(res, 'label')` from util/bounded-read.js.");
  });

  it('no error body is read by hand', () => {
    const offenders = [];
    for (const f of sourceFiles()) {
      if (f === HELPER) continue;
      const src = code(f);
      for (const m of src.matchAll(/\.text\(\)\s*\.catch\(/g)) offenders.push(`${f}: ${m[0]}`);
    }
    assert.deepEqual(offenders, [], 'these read an upstream error body unbounded. Five sites did this by hand and '
      + 'three truncated at 200 chars while two did not, so the truncation was drift rather than a decision.\n  '
      + offenders.join('\n  ') + '\n\nUse `boundedErrorText(res)`.');
  });

  it('and the helper is actually used, so the two checks above are not vacuous', () => {
    // A pattern that stopped matching would report zero offenders and pass while verifying nothing. The floor is
    // the other half of every enumeration gate in this repo.
    let jsonSites = 0;
    let textSites = 0;
    for (const f of sourceFiles()) {
      if (f === HELPER) continue;
      const src = code(f);
      jsonSites += (src.match(/boundedJson[<(]/g) ?? []).length;
      textSites += (src.match(/boundedErrorText\(/g) ?? []).length;
    }
    assert.ok(jsonSites >= 12, `only ${jsonSites} boundedJson call sites; 12 were routed, so some regressed`);
    assert.ok(textSites >= 5, `only ${textSites} boundedErrorText call sites; 5 were routed`);
  });
});

describe('the bounded JSON reader', () => {
  const jsonRes = (body, headers = {}) => new Response(body, {
    headers: { 'content-type': 'application/json', ...headers },
  });

  it('reads a normal body', async () => {
    const out = await mod.boundedJson(jsonRes(JSON.stringify({ ok: 1 })), 'test');
    assert.deepEqual(out, { ok: 1 });
  });

  it('refuses a declared-oversize body without reading it', async () => {
    const res = jsonRes('{}', { 'content-length': String(50 * 1024 * 1024) });
    await assert.rejects(
      () => mod.boundedJson(res, 'test', 1024),
      /too large: 52428800 bytes/,
      'content-length is the cheap check: an upstream that declares 50 MiB against a 1 KiB cap must be refused '
      + 'before a byte is read',
    );
  });

  it('aborts a body that exceeds the cap while streaming, even with no content-length', async () => {
    // The declared length is advisory and an upstream may omit or lie about it, so the streaming check is the
    // actual guard. Removing it leaves a hole that content-length alone cannot cover.
    const big = 'x'.repeat(4096);
    const stream = new ReadableStream({
      start(c) {
        for (let i = 0; i < 8; i++) c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    await assert.rejects(
      () => mod.boundedJson(new Response(stream), 'test', 1024),
      /exceeded 1024 bytes/,
    );
  });

  it('names the source and the escape hatch in the error', async () => {
    // "response too large" with no source is an unactionable log line, and a cap with no documented override is
    // one an operator has to read our source to discover.
    await assert.rejects(
      () => mod.boundedJson(jsonRes('x'.repeat(5000)), 'doc-render sidecar', 100),
      (err) => {
        assert.match(err.message, /doc-render sidecar/, 'the error does not name which upstream');
        assert.match(err.message, /YTHRIL_MAX_UPSTREAM_RESPONSE_BYTES/, 'the error does not name the override');
        return true;
      },
    );
  });

  it('falls back to the default when the cap env var is malformed, never to unbounded', () => {
    const saved = process.env.YTHRIL_MAX_UPSTREAM_RESPONSE_BYTES;
    try {
      // Asserted as a CHOICE, not an effect: a malformed value becoming Infinity and becoming 256 MiB both let a
      // small body through, so every effect-based assertion here passes either way.
      for (const bad of ['nonsense', '0', '-1', 'NaN', '']) {
        process.env.YTHRIL_MAX_UPSTREAM_RESPONSE_BYTES = bad;
        assert.equal(
          mod.maxUpstreamResponseBytes(), mod.DEFAULT_MAX_UPSTREAM_RESPONSE_BYTES,
          `'${bad}' resolved to ${mod.maxUpstreamResponseBytes()} — a typo must not remove the bound`,
        );
      }
      process.env.YTHRIL_MAX_UPSTREAM_RESPONSE_BYTES = '4096';
      assert.equal(mod.maxUpstreamResponseBytes(), 4096, 'a deliberate override must still work');
    } finally {
      if (saved === undefined) delete process.env.YTHRIL_MAX_UPSTREAM_RESPONSE_BYTES;
      else process.env.YTHRIL_MAX_UPSTREAM_RESPONSE_BYTES = saved;
    }
  });
});

describe('the bounded error-body reader', () => {
  it('truncates and says so', async () => {
    const out = await mod.boundedErrorText(new Response('e'.repeat(5000)), 50);
    assert.equal(out.length, 50 + '… (truncated)'.length);
    assert.match(out, /truncated/, 'a silently truncated error body reads as a complete one');
  });

  it('returns a short body unchanged', async () => {
    assert.equal(await mod.boundedErrorText(new Response('upstream said no')), 'upstream said no');
  });

  it('never throws, because an error path that can fail replaces a diagnosable failure with a confusing one', async () => {
    const broken = new Response(new ReadableStream({
      start(c) { c.error(new Error('connection reset mid-error-body')); },
    }));
    assert.equal(await mod.boundedErrorText(broken), '', 'it threw, so the real upstream status is now lost');
  });
});
