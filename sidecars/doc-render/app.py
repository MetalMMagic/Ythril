"""
Ythril document-render sidecar (F11).

Renders PDF pages to PNG images (via PDFium, through pypdfium2) so the VLM document-extraction path can
read page images. Deliberately tiny and single-purpose: it parses UNTRUSTED user documents, so it is
designed to run isolated — non-root, on an internal-only network with no database and no internet egress
(see docker-compose.yml `ythril-convert`), resource-limited, with defensive input caps here as a second
layer.

Licensing: PDFium (via pypdfium2) is Apache-2.0 / BSD-3-Clause and Pillow is HPND — all permissive, no
copyleft. (We deliberately do NOT use PyMuPDF, which is AGPL-3.0.) See LICENSES.md.

Endpoints:
  GET  /health                      -> {"status": "ok"}
  POST /render  (multipart 'file')  -> {"pages": [<base64 png>...], "count", "total", "truncated",
                                        "startPage", "dpi"}
    query: dpi (72..600), maxPages (1..RENDER_MAX_PAGES), startPage (>=0)

`startPage` lets the caller walk a long document in windows instead of losing everything past `maxPages`.
Memory is unchanged by it: one page is rendered at a time and at most `maxPages` are held encoded, whichever
window is being asked for. `truncated` means "there are pages after this window", so a caller can loop until
it is false without knowing `total` up front.
"""
import base64
import io
import os

import pypdfium2 as pdfium
from fastapi import FastAPI, File, HTTPException, Query, UploadFile

# Defensive caps (second layer — the Node caller already size/page-caps). Overridable via env.
MAX_BYTES = int(os.environ.get("RENDER_MAX_BYTES", str(100 * 1024 * 1024)))  # 100 MiB
MAX_PAGES_HARD = int(os.environ.get("RENDER_MAX_PAGES", "500"))

app = FastAPI(title="ythril-doc-render", docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/render")
async def render(
    file: UploadFile = File(...),
    dpi: int = Query(150, ge=72, le=600),
    maxPages: int = Query(50, ge=1, le=MAX_PAGES_HARD),
    startPage: int = Query(0, ge=0),
) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"file exceeds {MAX_BYTES} bytes")

    try:
        pdf = pdfium.PdfDocument(data)
    except Exception as exc:  # malformed / non-PDF input
        raise HTTPException(status_code=400, detail=f"cannot open document: {exc}") from exc

    try:
        total = len(pdf)
        # The window is [startPage, end). A startPage at or past the end renders nothing rather than
        # erroring: a caller walking to the end should get an empty, non-truncated result and stop, not a
        # 4xx it has to special-case on the last iteration.
        start = min(startPage, total)
        end = min(total, start + maxPages)
        scale = dpi / 72.0  # pypdfium2 render scale is relative to 72 DPI
        pages = []
        # Render page-by-page and release each bitmap/page promptly — bound memory to ~one page in flight.
        # Unchanged by windowing: at most `maxPages` are ever held encoded, whichever window is requested.
        for i in range(start, end):
            page = pdf[i]
            bitmap = page.render(scale=scale)
            pil = bitmap.to_pil()
            buf = io.BytesIO()
            pil.save(buf, format="PNG")
            pages.append(base64.b64encode(buf.getvalue()).decode("ascii"))
            bitmap.close()
            page.close()
    finally:
        pdf.close()

    return {
        "pages": pages,
        "count": len(pages),
        "total": total,
        # "there are pages after this window" — so a caller can loop until false without knowing `total`.
        "truncated": end < total,
        "startPage": start,
        "dpi": dpi,
    }
