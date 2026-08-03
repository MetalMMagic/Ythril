# 001 — PDF and office rasterisation uses PDFium, not PyMuPDF

**Status:** accepted · **Scope:** `sidecars/doc-render`, `sidecars/doc-office`

## Context

The F11 document-extraction path renders PDF pages to PNG so a vision model can read them. The obvious Python choice
is **PyMuPDF**: it is fast, its API is pleasant, and every tutorial uses it.

PyMuPDF is **AGPL-3.0**. Ythril redistributes its sidecars as container images built from this repository, so an
AGPL-licensed rasteriser would put AGPL obligations — including §13's network-use clause — onto every operator who
runs one.

Office documents raise the same question one step further out: converting DOCX/EPUB needs LibreOffice, which is
**MPL-2.0 / LGPL-3.0**.

## Decision

**PDFium**, via `pypdfium2` (Apache-2.0 / BSD-3-Clause), with Pillow (HPND) for image handling. All permissive.

For office formats, **LibreOffice converts to PDF and PDFium rasterises it** — and LibreOffice is invoked as a
**separate process**, never linked. Separate-process use is what keeps its LGPL obligations off the rest of the image.

## Consequences

- Rasterisation is a little more code than PyMuPDF would need. That is the whole cost.
- An operator can redistribute the sidecar images without inheriting a copyleft obligation.
- **This is the reversal to prevent:** somebody hits a PDFium edge case, reaches for PyMuPDF because it handles it in
  one line, and the licence change arrives silently inside a bug fix. If PyMuPDF ever becomes necessary, it needs a new
  decision record and a deliberate look at what the licence means for redistribution — not a dependency bump.
- Audit lens 1 (Legal & Compliance) swept 1,147 packages and found no AGPL/SSPL/BUSL anywhere in the installed tree.
  That result is only true while this decision holds.

## Where the detail lives

- `docs/dependencies.md` — the sidecar table, with the licence of each component and the explicit "deliberately
  **not** PyMuPDF (AGPL-3.0)" note.
- `sidecars/doc-render/LICENSES.md` and `sidecars/doc-office/LICENSES.md` — per-component licences for each image.
- `NOTICE` — attribution for everything redistributed.
- `testing/standalone/no-copyleft-in-the-shipped-tree.test.js` — the gate that fails if a copyleft licence appears in
  what ships.
