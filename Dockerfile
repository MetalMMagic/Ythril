# syntax=docker/dockerfile:1
# ── Stage 1: Build Angular SPA ───────────────────────────────────────────────
FROM node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS client-builder

WORKDIR /build

# Copy workspace manifests for layer caching
COPY package.json package-lock.json* ./
COPY client/package.json ./client/

# Install client dependencies
RUN npm ci --workspace=client

# Copy source and build.
#
# `docs/` comes along because the in-product Help page renders the SHIPPED guides: angular.json copies
# docs/*.md into the client's assets, so an operator can answer "what does this setting do?" without
# leaving the instance — which matters most exactly where it is hardest, on an air-gapped install with
# no route to github.com. Without this COPY the asset glob resolves to nothing and Help ships empty.
COPY client/ ./client/
COPY docs/ ./docs/
RUN npm run build:prod --workspace=client
# Angular output: client/dist/browser/

# ── Stage 2: Build server ────────────────────────────────────────────────────
FROM node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS builder

# Build tools required for bcrypt native C++ addon
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY server/package.json ./server/

# Install all dependencies (including devDependencies for TypeScript compiler)
RUN npm ci --workspace=server

# Copy source
COPY server/ ./server/

# Compile TypeScript
RUN npm run build --workspace=server

# ── Stage 1b: Production dependencies, built WITH the toolchain ──────────────
#
# The production stage used to run `npm ci --omit=dev` itself, which meant it needed `python3 make g++` to
# compile the bcrypt native addon — a compiler in the shipped image that nothing at runtime uses.
#
# MEASURED, because the first estimate here was wrong: that apt layer was 755 MB total, but ffmpeg is 472 MB of
# it. Removing the toolchain takes the layer to **472 MB — a 283 MB saving**, not 755. The layer also changes
# digest on every release regardless of the lockfile, because `apt-get update` is not reproducible, so it was
# re-downloaded on every pull; that half of the problem is unchanged, since ffmpeg still needs apt.
#
# Its own stage rather than reusing `builder`: builder's `node_modules` includes devDependencies (it needs the
# TypeScript compiler), so copying from there would ship those too. This installs the production tree only.
#
# ABI safety, which is the whole risk in moving a native addon between stages: same pinned base image, so the
# same Node version and the same libc. The compiled `.node` binary is copied, not rebuilt — `docker-boot.test.js`
# asserts bcrypt actually loads in the final image, because a broken native addon fails at REQUIRE time and
# would otherwise show up as a login that 500s rather than as a build error.
FROM node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS prod-deps

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
RUN npm ci --workspace=server --omit=dev

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-slim@sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3 AS production

LABEL org.opencontainers.image.source="https://github.com/ythril-network/Ythril"
LABEL org.opencontainers.image.description="Ythril — self-hosted brain & knowledge management platform"
LABEL org.opencontainers.image.licenses="PolyForm-Small-Business-1.0.0"

# NO python3/make/g++ here any more — the toolchain lives in the `prod-deps` stage and the compiled addon is
# copied in below. That removes a 755 MB layer from the shipped image, and with it a layer that changed digest
# on every release for no reason anyone wanted: `apt-get update` is not reproducible, so it was re-downloaded on
# every pull even when nothing about it had changed.
#
# ffmpeg: LGPL-2.1+ core only (no GPL codecs); used for audio/video media embedding pipeline.
# Verify at build time: ffmpeg -buildconf | grep enable-gpl must be absent.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json* ./
COPY server/package.json ./server/

# The production dependency tree, already installed and already compiled, from a stage that had a compiler.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules

# Pre-download & cache the embedding model so first startup is instant and fully offline.
# The model is then copied into the image layer so the container starts offline.
#
# This runs BEFORE the app-source COPYs below on purpose: it depends only on the
# @huggingface/transformers npm package (installed above), NOT on our source. So
# a normal source change does not invalidate this layer, which lets a layer cache
# (CI's `--cache-from type=gha`) restore the already-downloaded model instead of
# re-fetching ~274 MB from HuggingFace on every build. HF rate-limits anonymous
# downloads per-IP (shared CI egress → intermittent 403), so the fewer fetches the
# better; the retry/backoff below rides through a transient 403 on the rare build
# that does have to download. `--mount=type=cache` additionally speeds local rebuilds.
#
# The step ends by fixing ownership AND stamping every file to a fixed mtime. Both decide what a user downloads:
#   - ownership HERE rather than in a later `chown -R`, which would rewrite the whole tree into a second layer.
#     It did: the published image shipped the model TWICE. See the note by the mkdir near the end of this file.
#   - a fixed mtime because `cp -a` preserves the download's timestamps, and those land in the layer tar. Two
#     builds of the identical model then produce different layer digests, so the layer can never be reused across
#     releases even when nothing about the model changed. Determinism is the precondition for that reuse.
ENV MODEL_CACHE_DIR=/app/model-cache
RUN --mount=type=cache,target=/tmp/hf-model-cache \
    printf '%s\n' \
    'import { pipeline, env } from "@huggingface/transformers";' \
    'env.cacheDir = "/tmp/hf-model-cache";' \
    'const load = () => pipeline("feature-extraction", "nomic-ai/nomic-embed-text-v1.5", { dtype: "fp32" });' \
    'const attempts = 6;' \
    'for (let i = 1; i <= attempts; i++) {' \
    '  try { await load(); break; }' \
    '  catch (err) {' \
    '    if (i === attempts) throw err;' \
    '    const delay = Math.min(60, 2 ** i);' \
    '    console.warn(`model download attempt ${i}/${attempts} failed: ${err}; retrying in ${delay}s`);' \
    '    await new Promise(r => setTimeout(r, delay * 1000));' \
    '  }' \
    '}' \
    > /app/server/warm.mjs && \
    node /app/server/warm.mjs && \
    rm /app/server/warm.mjs && \
    mkdir -p /app/model-cache && \
    cp -a /tmp/hf-model-cache/. /app/model-cache/ && \
    chown -R node:node /app/model-cache && \
    find /app/model-cache -exec touch -h -d '@1' {} +

# No model may be fetched at RUN TIME. Set after the warm step above, which is the one place a download
# is legitimate — it happens on a build machine, once, and its result is what ships.
#
# `env.allowRemoteModels` defaults to TRUE in @huggingface/transformers, so before this a cache MISS
# silently downloaded from huggingface.co: the instance's IP and the model id it asked for, to a third
# party, with no configuration, from an image whose README says "works fully offline". Exactly one model
# is baked in, so every other id — and every id at all on an install with an empty cache — was that request.
#
# `HF_HUB_OFFLINE` is the ecosystem's name for this and is already set on the `unstructured` sidecar in
# docker-compose.yml, for the same reason. transformers.js does not read it (it is Python's), so
# `brain/embedding.ts` maps it onto `env.allowRemoteModels` itself.
#
# This cannot break the bundled model: transformers.js consults its FileCache BEFORE deciding local vs
# remote, so the baked `/app/model-cache` satisfies the load. Verified against a real populated cache —
# the default model loads with remote fetching disabled; a model that is NOT baked fails with a message
# naming this flag. An operator who deliberately wants a different model sets `HF_HUB_OFFLINE=0`.
ENV HF_HUB_OFFLINE=1

# Copy compiled output from builder
COPY --from=builder /build/server/dist ./server/dist

# Copy compiled Angular SPA from client-builder
COPY --from=client-builder /build/client/dist/browser ./client/dist/browser

# The licence and the third-party notices, INSIDE the image.
#
# They were not here, and the image is the primary distribution — most users never see the git repo. That made the
# one place the notices are legally required the one place they were absent:
#
#   - Apache-2.0 §4(d): a distribution of a work that carries a NOTICE file "must include a readable copy of the
#     attribution notices contained within such NOTICE file". Ythril redistributes several Apache-2.0 works in this
#     image — @huggingface/transformers, sharp, and the embedding model weights themselves.
#   - MIT: "The above copyright notice and this permission notice shall be included in all copies or substantial
#     portions of the Software." An image is a copy.
#
# A few KB, in the app layer where it belongs. Found by the Legal & Compliance audit lens; asserted by
# `notice-ships-in-the-image`.
COPY NOTICE LICENSE ./

ENV NODE_ENV=production
ENV PORT=3200
ENV CONFIG_PATH=/config/config.json
ENV DATA_ROOT=/data
ENV CLIENT_DIST=/app/client/dist/browser

EXPOSE 3200

# Pre-create mount-point directories owned by node so volume mounts are writable.
#
# `/app/model-cache` is NOT chowned here, and that is the point. A `chown -R` rewrites every file's metadata, so
# Docker copied the whole 482.5 MiB model tree into a SECOND layer — the published image shipped the embedding
# model TWICE, in every tag, on every pull. Measured against the registry: layer 10 was the model at 482.5 MiB and
# layer 13 was this chown at exactly 482.5 MiB, which no `mkdir` of two empty directories can account for.
#
# The ownership is set inside the RUN that creates the cache instead, so it lands in that one layer.
# `/data` and `/config` are empty, so chowning them costs nothing.
RUN mkdir -p /data /config && chown -R node:node /data /config

# Run as non-root user
USER node

CMD ["node", "server/dist/index.js"]
