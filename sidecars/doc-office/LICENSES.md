# doc-office sidecar — third-party licenses

The sidecar's own code (`app.py`, `Dockerfile`) is part of Ythril and under Ythril's license. Its bundled
runtime dependencies are **all permissive (no copyleft)** except LibreOffice, which is **MPL-2.0 / LGPL-3.0
(not AGPL)** and is invoked as a **separate process** (via `soffice --headless`), not linked into Ythril —
so it does not impose copyleft on Ythril or its distribution. Enumerated for the top-level `NOTICE`:

| Component | Version | License | Notes |
|---|---|---|---|
| LibreOffice | (Debian `libreoffice-*`) | MPL-2.0 / LGPL-3.0 | Office → PDF conversion. Separate process, not linked. |
| PDFium | (via pypdfium2) | BSD-3-Clause | Google's PDF renderer (used in Chromium). |
| pypdfium2 | 4.30.0 | Apache-2.0 / BSD-3-Clause | Python bindings to PDFium. |
| Pillow | 11.0.0 | HPND (MIT/BSD-style) | PNG encoding. |
| FastAPI | 0.115.6 | MIT | HTTP layer. |
| Starlette | (via FastAPI) | BSD-3-Clause | ASGI framework. |
| Pydantic | (via FastAPI) | MIT | |
| Uvicorn | 0.34.0 | BSD-3-Clause | ASGI server. |
| python-multipart | 0.0.20 | Apache-2.0 | multipart/form-data parsing. |
| fonts-liberation | (Debian) | OFL-1.1 | Metric-compatible fonts for layout fidelity. |
| Python (base image) | 3.13-slim | PSF License (+ Debian components) | Digest-pinned in the Dockerfile. |

## Why LibreOffice (MPL/LGPL), not PyMuPDF (AGPL)

Rasterizing an **office** document requires first converting it to PDF (or directly to images). The
high-fidelity, self-contained way to do that is **LibreOffice headless** — which is **MPL-2.0 / LGPL-3.0**,
permissive-compatible, and here runs as an isolated subprocess (no linking). The subsequent PDF→PNG step
reuses **PDFium** (via `pypdfium2`), exactly as the `doc-render` sidecar does, deliberately avoiding the
AGPL-3.0 **PyMuPDF**. See the `doc-render` sidecar's `LICENSES.md` for the PDFium rationale.

## Why this sidecar is optional

LibreOffice adds substantial size (hundreds of MB) and cold-start latency, so — like the heavy
`unstructured-api` OCR sidecar — `doc-office` is **not** a default/startup dependency. It is enabled with
the compose `office` profile (`docker compose --profile office up -d`). When it is not running, office docs
in a VLM extraction mode simply fall back to OCR, unchanged from before this feature.
