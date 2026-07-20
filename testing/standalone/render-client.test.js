/**
 * F11 — render sidecar client (`files/converters/renderer.ts`), tested against mock HTTP sidecars so no
 * Docker/PDF/LibreOffice is needed. Covers the availability probes (+ caching), page decode, error paths,
 * and — F11-a — format routing: PDFs go to `doc-render`, office docs go to `doc-office`.
 *
 * Run: node --test testing/standalone/render-client.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// ── Two mock sidecars (PDF render + office render) ───────────────────────────
function mockSidecar(state) {
  return http.createServer((req, res) => {
    const url = req.url ?? '';
    if (url.startsWith('/health')) {
      res.writeHead(state.health, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: state.health === 200 ? 'ok' : 'bad' }));
      return;
    }
    if (url.startsWith('/render') && req.method === 'POST') {
      req.on('data', () => {}); // drain the multipart body
      req.on('end', () => {
        res.writeHead(state.status, { 'content-type': 'application/json' });
        res.end(state.body ?? JSON.stringify({
          // Tag the page content so the test can assert WHICH sidecar answered.
          pages: [Buffer.from(`PNG-${state.tag}-A`).toString('base64'), Buffer.from(`PNG-${state.tag}-B`).toString('base64')],
          count: 2, total: 3, truncated: true, dpi: 150,
        }));
      });
      return;
    }
    res.writeHead(404); res.end();
  });
}
const renderState = { health: 200, status: 200, body: null, tag: 'RENDER' };
const officeState = { health: 200, status: 200, body: null, tag: 'OFFICE' };
const renderSrv = mockSidecar(renderState);
const officeSrv = mockSidecar(officeState);
const renderBase = await new Promise((r) => renderSrv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${renderSrv.address().port}`)));
const officeBase = await new Promise((r) => officeSrv.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${officeSrv.address().port}`)));
process.env.RENDER_SIDECAR_URL = renderBase;
process.env.RENDER_OFFICE_SIDECAR_URL = officeBase;

const R = await import('../../server/dist/files/converters/renderer.js');

describe('render client — format detection', () => {
  it('classifies office documents vs PDFs by extension', () => {
    for (const f of ['a.docx', 'b.DOCX', 'c.epub', 'd.pptx', 'e.odt', 'f.rtf', 'g.xlsx']) {
      assert.equal(R.isOfficeDocument(f), true, f);
    }
    for (const f of ['a.pdf', 'b.PDF', 'c.png', 'noext']) {
      assert.equal(R.isOfficeDocument(f), false, f);
    }
  });
});

describe('render client — availability probes', () => {
  it('isRenderAvailable() reflects the PDF sidecar /health (and caches)', async () => {
    R._resetRenderHealthCache(); renderState.health = 200;
    assert.equal(await R.isRenderAvailable(), true);
    renderState.health = 500; // cache holds within TTL
    assert.equal(await R.isRenderAvailable(), true);
    R._resetRenderHealthCache();
    assert.equal(await R.isRenderAvailable(), false);
    renderState.health = 200;
  });

  it('isOfficeRenderAvailable() reflects the office sidecar /health', async () => {
    R._resetRenderHealthCache(); officeState.health = 200;
    assert.equal(await R.isOfficeRenderAvailable(), true);
    R._resetRenderHealthCache(); officeState.health = 503;
    assert.equal(await R.isOfficeRenderAvailable(), false);
    officeState.health = 200;
  });

  it('isRenderAvailableFor() picks the office probe for office docs, the PDF probe otherwise', async () => {
    R._resetRenderHealthCache(); renderState.health = 200; officeState.health = 500;
    assert.equal(await R.isRenderAvailableFor('report.pdf'), true);   // PDF sidecar up
    R._resetRenderHealthCache();
    assert.equal(await R.isRenderAvailableFor('report.docx'), false); // office sidecar down
    officeState.health = 200;
  });
});

describe('render client — renderDocumentPages routing + decode', () => {
  it('routes a PDF to the doc-render sidecar and decodes pages/total/truncated', async () => {
    const r = await R.renderDocumentPages(Buffer.from('%PDF-fake'), { fileName: 'x.pdf', maxPages: 2 });
    assert.equal(r.pages.length, 2);
    assert.equal(r.pages[0].toString(), 'PNG-RENDER-A'); // answered by the PDF sidecar
    assert.equal(r.total, 3);
    assert.equal(r.truncated, true);
  });

  it('routes an office doc to the doc-office sidecar', async () => {
    const r = await R.renderDocumentPages(Buffer.from('PK-docx'), { fileName: 'report.docx' });
    assert.equal(r.pages[0].toString(), 'PNG-OFFICE-A'); // answered by the office sidecar
  });

  it('throws on a sidecar error status (→ caller falls back to OCR)', async () => {
    officeState.status = 422; officeState.body = JSON.stringify({ detail: 'office->pdf conversion failed' });
    await assert.rejects(() => R.renderDocumentPages(Buffer.from('x'), { fileName: 'x.docx' }), /doc-office sidecar error 422/);
    officeState.status = 200; officeState.body = null;
  });

  it('throws when the target sidecar is unreachable', async () => {
    await new Promise((r) => officeSrv.close(r));
    await assert.rejects(() => R.renderDocumentPages(Buffer.from('x'), { fileName: 'x.docx' }), /doc-office sidecar unreachable/);
    await new Promise((r) => renderSrv.close(r));
  });
});
