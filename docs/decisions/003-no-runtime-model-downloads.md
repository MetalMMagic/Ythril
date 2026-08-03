# 003 — The published image may not fetch a model at runtime

**Status:** accepted · **Scope:** `Dockerfile`, `server/src/brain/embedding.ts`

## Context

`README.md` says Ythril **works fully offline**, and `userguide.md` says it "needs no internet connection, which is the
point: the installs that most need [it]". Air-gapped deployments are a headline use case.

`@huggingface/transformers` defaults `env.allowRemoteModels` to **`true`**. The embedding loader set `env.cacheDir` and
nothing else, so loading a model that was not in that cache **downloaded it from `huggingface.co`** — carrying the
instance's IP address and the model id to a third party, with no configuration and no log line. The image bakes
exactly one model, so any other model id, and any id at all on a from-source install with an empty cache, was that
request.

The same failure had already been found once, for the other language: `docker-compose.yml` sets `HF_HUB_OFFLINE: "1"`
on the `unstructured` sidecar with a comment explaining that `huggingface_hub` calls the hub even for models baked into
the image. Nobody connected it to the Node process — which does not read that variable at all, because it belongs to
Python.

## Decision

The published image sets **`HF_HUB_OFFLINE=1`**, and `brain/embedding.ts` maps that variable (plus
`TRANSFORMERS_OFFLINE` and `YTHRIL_MODELS_OFFLINE`) onto `env.allowRemoteModels`.

The flag is set **after** the build-time warm step, which is the one place a download belongs: on a build machine,
once, with the result baked in.

When downloads *are* permitted (from source, or `HF_HUB_OFFLINE=0`), a cache miss **warns before it fetches**, naming
the host, the model and the size. A blocked miss is rewritten to name `MODEL_CACHE_DIR` and the flag, because the
library's own message points at a `node_modules` path that has nothing to do with where Ythril keeps models.

## Consequences

- Changing the embedding model on an image-based instance **fails loudly** instead of quietly downloading. The docs
  give the recipe for populating a cache on a machine that does have internet.
- This does not break the bundled model, and that was **measured, not argued**: `getModelFile` consults its `FileCache`
  before deciding local-versus-remote, so a populated `MODEL_CACHE_DIR` satisfies a load with remote fetching off.
  Verified against a real 523 MB cache by driving the compiled loader — the baked model loaded, an unbaked id failed
  with the rewritten error, and with the flag unset the warning appeared before the download.
- **This is the reversal to prevent:** an operator reports "the model will not load", and the quickest fix is to unset
  the flag. That turns a loud failure into a silent egress, and it will not be noticed, because a successful download
  looks like a working instance.

## Where the detail lives

- `Dockerfile` — the `ENV HF_HUB_OFFLINE=1` line, with a comment on why it sits after the warm step.
- `server/src/brain/embedding.ts` — `modelsOffline()`, the pre-fetch warning, and the rewritten error.
- `docs/integration-guide/02-hosting.md` — **Runtime Model Downloads**: the flag, what a miss reveals, a table of what
  each situation does, and how to populate a cache without opening the egress.
- `testing/standalone/no-runtime-model-egress.test.js` — the gate, which asserts the warning stays *before* the load
  and that the image sets the flag *after* the warm step.
