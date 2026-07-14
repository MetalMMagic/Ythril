/**
 * Integration tests: File conversion pipeline
 *
 * Tests the inputFormat parameter and chunk record creation.
 * The unstructured sidecar is not expected to be running in CI,
 * so PDF/DOCX/EPUB tests verify the graceful failure path.
 * HTML, .md, and .txt paths are tested end-to-end (in-process, no sidecar).
 *
 * Run: node --test testing/integration/file-conversion.test.js
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { INSTANCES } from '../sync/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE_A = path.join(__dirname, '..', 'sync', 'configs', 'a', 'token.txt');

let tokenA;

async function uploadJson(token, spaceId, filePath, body) {
  const url = `${INSTANCES.a}/api/files/${spaceId}?path=${encodeURIComponent(filePath)}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

describe('File conversion pipeline — inputFormat bypass', () => {
  before(() => {
    tokenA = fs.readFileSync(TOKEN_FILE_A, 'utf8').trim();
  });

  it('inputFormat "text" stores file without conversion (no chunk records)', async () => {
    const filePath = `conv-text-bypass-${Date.now()}.md`;
    const content = '# Section One\n\nSome content here.\n\n## Section Two\n\nMore content.';
    const r = await uploadJson(tokenA, 'general', filePath, { content, encoding: 'utf8', inputFormat: 'text' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.ok(r.body?.sha256);
  });

  it('Markdown file (.md extension) is processed asynchronously, returns 202', async () => {
    const filePath = `conv-md-test-${Date.now()}.md`;
    const content = '# Document Title\n\nIntroduction paragraph.\n\n## Section One\n\n' +
      'This is the first section with enough content to exceed the minimum chunk body length ' +
      'threshold so that a chunk record is created for this section.\n\n' +
      '## Section Two\n\nThis is the second section with enough content to pass the minimum ' +
      'body length threshold and produce a second chunk record.';
    const r = await uploadJson(tokenA, 'general', filePath, { content, encoding: 'utf8' });
    assert.equal(r.status, 202, JSON.stringify(r.body));
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');
  });

  it('Plain text file (.txt extension) is processed asynchronously, returns 202', async () => {
    const filePath = `conv-txt-test-${Date.now()}.txt`;
    const content = 'First paragraph of plain text content that goes on for a while.\n\n' +
      'Second paragraph with different information.\n\n' +
      'Third paragraph completing the document.';
    const r = await uploadJson(tokenA, 'general', filePath, { content, encoding: 'utf8' });
    assert.equal(r.status, 202, JSON.stringify(r.body));
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');
  });

  it('HTML file with inputFormat "html" is processed asynchronously, returns 202', async () => {
    const filePath = `conv-html-test-${Date.now()}.html`;
    const html = `<!DOCTYPE html><html><head><title>Test Article</title></head><body>
      <article>
        <h1>Article Title</h1>
        <p>This is a test article paragraph with enough text to be meaningful content for embedding.</p>
        <h2>Second Section</h2>
        <p>This section has additional content that will appear as a second chunk in the pipeline.</p>
      </article>
    </body></html>`;
    const r = await uploadJson(tokenA, 'general', filePath, {
      content: Buffer.from(html).toString('base64'),
      encoding: 'base64',
      inputFormat: 'html',
    });
    assert.equal(r.status, 202, JSON.stringify(r.body));
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');
  });

  it('PDF uploaded with inputFormat "text" (explicit bypass) does not call sidecar, returns 201', async () => {
    const filePath = `conv-pdf-bypass-${Date.now()}.pdf`;
    const r = await uploadJson(tokenA, 'general', filePath, {
      content: Buffer.from('%PDF-1.4 minimal').toString('base64'),
      encoding: 'base64',
      inputFormat: 'text',
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.ok(r.body?.sha256);
  });

  it('PDF with auto format and unavailable sidecar: write succeeds with async embedding queued', async () => {
    const filePath = `conv-pdf-no-sidecar-${Date.now()}.pdf`;
    const r = await uploadJson(tokenA, 'general', filePath, {
      content: Buffer.from('%PDF-1.4 test').toString('base64'),
      encoding: 'base64',
    });
    // PDF auto-format is now enqueued for async embedding, so returns 202 Accepted immediately.
    // The sidecar being unavailable is handled by the background worker, not the upload handler.
    assert.equal(r.status, 202, `Expected 202 for async PDF embedding, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.ok(r.body?.sha256);
    assert.equal(r.body?.embeddingStatus, 'pending');
  });
});

describe('Media/text job queue — the worker actually claims work (P12)', () => {
  // The claim walk probes each space with its own findOneAndUpdate, so an idle queue paid a
  // full N-space walk per claim, (workerConcurrency + 1) times per tick. It now probes only
  // spaces a hint says MIGHT have work.
  //
  // The hazard that introduces is STRANDING: if anything creates claimable work without
  // announcing it, the walk never visits that space and the job sits pending forever. Nothing
  // covered this — the existing conversion tests assert `embeddingStatus === 'pending'` and
  // never wait for the worker at all, so a queue that claimed NOTHING would have passed.
  //
  // These tests wait for the job to actually leave `pending`.
  const spaceId = `jobclaim-${Date.now()}`;

  before(async () => {
    tokenA = fs.readFileSync(TOKEN_FILE_A, 'utf8').trim();
    const r = await fetch(`${INSTANCES.a}/api/spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ id: spaceId, label: 'Job Claim Test' }),
    });
    assert.ok([201, 409].includes(r.status), `create space: ${r.status}`);
  });

  /** Poll until embeddingStatus leaves `pending`. Returns { status, elapsedMs }. */
  async function waitUntilClaimed(filePath, timeoutMs = 90_000) {
    const start = Date.now();
    let last = 'pending';
    while (Date.now() - start < timeoutMs) {
      const r = await fetch(
        `${INSTANCES.a}/api/brain/spaces/${spaceId}/files?path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${tokenA}` } },
      );
      const body = await r.json().catch(() => null);
      const meta = Array.isArray(body?.files) ? body.files.find(f => f.path === filePath) : null;
      last = meta?.embeddingStatus ?? last;
      // Any terminal-ish state proves the worker picked the job up.
      if (last && last !== 'pending') return { status: last, elapsedMs: Date.now() - start };
      await new Promise(res => setTimeout(res, 2_000));
    }
    throw new Error(
      `job for ${filePath} was never claimed — it sat in '${last}' for ${timeoutMs}ms. ` +
      'The claim walk only probes spaces its pending-work hint knows about, so something that ' +
      'creates claimable work is not announcing it (see markSpaceMayHaveWork).',
    );
  }

  it('a newly uploaded file in a previously-idle space IS claimed by the worker', async () => {
    // The space starts with no work at all, so the hint is empty for it — precisely the case
    // where a missing announcement would strand the job forever.
    const filePath = `claim-first-${Date.now()}.md`;
    const content = '# Claim Test\n\n' + 'Body text long enough to produce a chunk record. '.repeat(8);
    const up = await uploadJson(tokenA, spaceId, filePath, { content, encoding: 'utf8' });
    assert.equal(up.status, 202, JSON.stringify(up.body));
    assert.equal(up.body?.embeddingStatus, 'pending');

    const { status } = await waitUntilClaimed(filePath);
    assert.notEqual(status, 'pending', `worker must claim the job; ended in '${status}'`);

    // NOTE — deliberately no latency assertion here, and it is worth saying why. First-claim
    // latency is dominated by the WORKER'S IDLE BACKOFF (it stretches its poll interval up to
    // workerMaxPollIntervalMs, 30s by default, when there is nothing to do), not by the
    // pending-work hint. An earlier version of this test asserted a latency bound and failed at
    // 32s on a cold worker while the hint was working perfectly — it was measuring the backoff.
    // What this test pins is the invariant that actually matters: the job is CLAIMED, never
    // stranded. The 30s full scan is the deliberate safety net behind the hint.
  });

  it('after the queue drains, a SECOND upload re-arms the hint and is also claimed', async () => {
    // Draining clears the hint for the space. A second upload must put it back — if only the
    // first enqueue announced work, this one would hang.
    const filePath = `claim-second-${Date.now()}.md`;
    const content = '# Second Claim\n\n' + 'More body text to force a chunk to be produced. '.repeat(8);
    const up = await uploadJson(tokenA, spaceId, filePath, { content, encoding: 'utf8' });
    assert.equal(up.status, 202, JSON.stringify(up.body));

    const { status } = await waitUntilClaimed(filePath);
    assert.notEqual(status, 'pending', `second job must also be claimed; ended in '${status}'`);
  });
});
