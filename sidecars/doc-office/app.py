"""
Ythril office-render sidecar (F11-a) — OPTIONAL / opt-in.

Converts office documents (DOCX/DOC/ODT/RTF/EPUB/PPTX/XLSX/…) to PDF with LibreOffice (headless), then
rasterizes the PDF to page PNGs via PDFium (pypdfium2) — the exact `/render` contract the `doc-render`
sidecar speaks, so the VLM document-extraction path can read office docs too. It is heavy (LibreOffice),
so it is NOT bundled by default: enable it with the compose `office` profile. When it is absent, the Node
caller degrades office docs to OCR, exactly as before F11-a.

Untrusted input → runs isolated (non-root, internal-only network, no DB, no internet egress), resource-
limited, with input caps here as a second layer. Any conversion failure returns 4xx/5xx so the caller
falls back to OCR — a LibreOffice hiccup must never take the media worker down.

Licensing: LibreOffice is MPL-2.0 / LGPL-3.0 (**not** AGPL) and is invoked as a separate process (not
linked), so it does not affect Ythril's permissive posture. PDFium (via pypdfium2) is Apache-2.0 /
BSD-3-Clause and Pillow is HPND — all permissive. (We deliberately do NOT use PyMuPDF, which is AGPL-3.0.)
See LICENSES.md.

Endpoints:
  GET  /health                      -> {"status": "ok"}
  POST /render  (multipart 'file')  -> {"pages": [<base64 png>...], "count", "total", "truncated", "dpi"}
    query: dpi (72..600), maxPages (1..RENDER_MAX_PAGES), startPage (>=0)

`startPage` mirrors doc-render so a caller can walk either sidecar the same way, taking one window of pages
at a time instead of losing everything past `maxPages`.
"""
import base64
import io
import os
import pathlib
import subprocess
import tempfile

import pypdfium2 as pdfium
from fastapi import FastAPI, File, HTTPException, Query, UploadFile

# Defensive caps (second layer — the Node caller already size/page-caps). Overridable via env.
MAX_BYTES = int(os.environ.get("RENDER_MAX_BYTES", str(100 * 1024 * 1024)))  # 100 MiB
MAX_PAGES_HARD = int(os.environ.get("RENDER_MAX_PAGES", "500"))
CONVERT_TIMEOUT = int(os.environ.get("OFFICE_CONVERT_TIMEOUT", "120"))  # seconds for soffice

app = FastAPI(title="ythril-doc-office", docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _office_to_pdf(data: bytes, filename: str, workdir: str) -> bytes:
    """Convert office bytes → PDF via headless LibreOffice, isolated to a per-request temp dir."""
    src = pathlib.Path(workdir) / (pathlib.Path(filename).name or "input")
    if not src.suffix:  # LibreOffice picks the import filter from the extension
        src = src.with_suffix(".docx")
    src.write_bytes(data)
    # A private UserInstallation profile keeps soffice off any shared $HOME (the container is read-only
    # apart from this tmpfs), and lets concurrent requests not collide.
    profile = (pathlib.Path(workdir) / "louser").as_uri()
    try:
        proc = subprocess.run(
            [
                "soffice", "--headless", "--norestore", "--nolockcheck", "--nodefault",
                f"-env:UserInstallation={profile}",
                "--convert-to", "pdf", "--outdir", workdir, str(src),
            ],
            capture_output=True,
            timeout=CONVERT_TIMEOUT,
        )
    except subprocess.TimeoutExpired as exc:
        raise HTTPException(status_code=504, detail="office conversion timed out") from exc
    pdfs = [p for p in pathlib.Path(workdir).glob("*.pdf")]
    if proc.returncode != 0 or not pdfs:
        err = (proc.stderr or proc.stdout or b"").decode("utf-8", "replace")[:400]
        raise HTTPException(status_code=422, detail=f"office->pdf conversion failed: {err}")
    return pdfs[0].read_bytes()


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

    with tempfile.TemporaryDirectory() as workdir:
        pdf_bytes = _office_to_pdf(data, file.filename or "input.docx", workdir)

        try:
            pdf = pdfium.PdfDocument(pdf_bytes)
        except Exception as exc:  # converted PDF unreadable
            raise HTTPException(status_code=422, detail=f"converted PDF unreadable: {exc}") from exc

        try:
            total = len(pdf)
            # Window [start, end) — see doc-render for the rationale; kept identical so a caller can walk
            # either sidecar the same way. A startPage past the end renders nothing rather than erroring.
            start = min(startPage, total)
            end = min(total, start + maxPages)
            scale = dpi / 72.0  # pypdfium2 render scale is relative to 72 DPI
            pages = []
            # Render page-by-page and release each bitmap/page promptly — bound memory to ~one page.
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
        # "there are pages after this window" — lets a caller loop without knowing `total` up front.
        "truncated": end < total,
        "startPage": start,
        "dpi": dpi,
    }
