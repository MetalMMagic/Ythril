"""
Ythril document-render sidecar (F11).

Renders PDF pages to PNG images (via PyMuPDF/fitz) so the VLM document-extraction path can read page
images. Deliberately tiny and single-purpose: it parses UNTRUSTED user documents, so it is designed to run
isolated — non-root, on an internal-only network with no database and no internet egress (see
docker-compose.yml `ythril-convert`), resource-limited, with defensive input caps here as a second layer.

Endpoints:
  GET  /health                      -> {"status": "ok"}
  POST /render  (multipart 'file')  -> {"pages": [<base64 png>...], "count", "total", "truncated", "dpi"}
    query: dpi (72..600), maxPages (1..RENDER_MAX_PAGES)
"""
import base64
import os

import fitz  # PyMuPDF
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
) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"file exceeds {MAX_BYTES} bytes")

    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:  # malformed / non-PDF input
        raise HTTPException(status_code=400, detail=f"cannot open document: {exc}") from exc

    try:
        total = doc.page_count
        n = min(total, maxPages)
        zoom = dpi / 72.0
        matrix = fitz.Matrix(zoom, zoom)
        pages = []
        # Render page-by-page and drop each pixmap promptly — bound memory to ~one page in flight.
        for i in range(n):
            pix = doc.load_page(i).get_pixmap(matrix=matrix, alpha=False)
            pages.append(base64.b64encode(pix.tobytes("png")).decode("ascii"))
            del pix
    finally:
        doc.close()

    return {
        "pages": pages,
        "count": len(pages),
        "total": total,
        "truncated": total > n,
        "dpi": dpi,
    }
