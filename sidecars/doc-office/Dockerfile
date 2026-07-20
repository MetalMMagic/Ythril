# Ythril office-render sidecar (F11-a) — office docs → PDF (LibreOffice) → page PNGs (PDFium/pypdfium2).
# OPTIONAL / opt-in: LibreOffice makes this image large, so it is enabled via the compose `office` profile
# rather than bundled. It parses untrusted documents, so it runs non-root on an internal-only network (no
# DB, no egress — enforced by compose/NetworkPolicy), resource-limited, with a read-only rootfs + a tmpfs
# for the per-request LibreOffice profile.
#
# Licensing: LibreOffice is MPL-2.0 / LGPL-3.0 (NOT AGPL) and is invoked as a separate process (not linked),
# so it does not affect Ythril's permissive posture. pypdfium2 + Pillow are permissive. See LICENSES.md.
# Base image digest-pinned (matches the doc-render sidecar) for reproducibility.
FROM python:3.13-slim@sha256:6771159cd4fa5d9bba1258caf0b82e6b73458c694d178ad97c5e925c2d0e1a91

# Headless LibreOffice: writer (docx/odt/rtf/epub), impress (pptx/odp), calc (xlsx/ods). --no-install-
# recommends avoids Java and the desktop stack; liberation fonts give reasonable layout fidelity.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer \
      libreoffice-impress \
      libreoffice-calc \
      fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Create an unprivileged user to run the service.
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin render

WORKDIR /app

# Install Python deps first for layer caching. pypdfium2 + Pillow ship manylinux wheels (no toolchain).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

USER render
EXPOSE 8100

# Single worker: conversion + render are CPU-bound; scale by container replicas, not in-process workers.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "1"]
