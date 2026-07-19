# Ythril document-render sidecar (F11) — PDF → page PNGs via PDFium (pypdfium2).
# Tiny, single-purpose, and hardened: it parses untrusted documents, so it runs non-root on an
# internal-only network (no DB, no egress — enforced by compose/NetworkPolicy). pypdfium2 + Pillow ship
# manylinux wheels, so no compiler/toolchain is needed in the image. All deps are permissively licensed
# (Apache-2.0 / BSD / HPND / MIT) — see LICENSES.md. Base image digest-pinned for reproducibility.
FROM python:3.13-slim@sha256:6771159cd4fa5d9bba1258caf0b82e6b73458c694d178ad97c5e925c2d0e1a91

# Create an unprivileged user to run the service.
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin render

WORKDIR /app

# Install deps first for layer caching. --no-cache-dir keeps the image small; no build toolchain needed.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

USER render
EXPOSE 8100

# Single worker: renders are CPU-bound; scale by container replicas, not in-process workers, and keep
# per-container memory bounded. Bind to all interfaces (the container is on an internal network only).
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "1"]
