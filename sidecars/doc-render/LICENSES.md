# doc-render sidecar — third-party licenses

The sidecar's own code (`app.py`, `Dockerfile`) is part of Ythril and under Ythril's license. Its bundled
runtime dependencies are **all permissive (no copyleft)** and are enumerated for the top-level `NOTICE`:

| Component | Version | License | Notes |
|---|---|---|---|
| PDFium | (via pypdfium2) | BSD-3-Clause | Google's PDF renderer (used in Chromium). |
| pypdfium2 | 4.30.0 | Apache-2.0 / BSD-3-Clause | Python bindings to PDFium. |
| Pillow | 11.0.0 | HPND (MIT/BSD-style) | PNG encoding. |
| FastAPI | 0.115.6 | MIT | HTTP layer. |
| Starlette | (via FastAPI) | BSD-3-Clause | ASGI framework. |
| Pydantic | (via FastAPI) | MIT | |
| Uvicorn | 0.34.0 | BSD-3-Clause | ASGI server. |
| python-multipart | 0.0.20 | Apache-2.0 | multipart/form-data parsing. |
| Python (base image) | 3.13-slim | PSF License (+ Debian components) | Digest-pinned in the Dockerfile. |

## Why not PyMuPDF

The obvious/fastest PDF renderer, **PyMuPDF (fitz), is AGPL-3.0** (dual-licensed with a paid commercial
option). AGPL's network-copyleft (§13) is incompatible with Ythril's permissive posture and with shipping
Ythril as a product, so it is **deliberately avoided**. PDFium (via `pypdfium2`) is the permissive,
high-fidelity equivalent (it is the renderer inside Chrome) and is used instead.
