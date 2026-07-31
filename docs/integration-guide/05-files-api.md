# Files API

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Files API

Base path: `/api/files`

> **Proxy spaces:** Read operations (GET) search across all member spaces. Write operations (POST, DELETE, PATCH, mkdir) require `?targetSpace=<member>` in the query string.

### Upload a File (raw bytes)

```http
POST /api/files/:spaceId?path=reports/q1.pdf
Content-Type: application/octet-stream

<raw bytes>
```

Any file type is supported — documents, images, binaries, archives, etc. Ythril stores the raw bytes as-is.

**The `Content-Type` header is not purely informational.** Together with the `?path=` extension it decides
which processing pipeline the file enters, and it is the type handed to the media providers — the vision
model receives it inside a data URI, and the speech-to-text provider uses it to name the uploaded audio.

Precedence is: a **specific** `Content-Type` wins; otherwise the **file extension** decides; only when both
are unusable does the file fall back to `application/octet-stream`. Generic values
(`application/octet-stream`, `binary/octet-stream`, `*/*`, …) count as "not stated", so
`POST …?path=photo.png` with `Content-Type: application/octet-stream` is correctly processed as
`image/png`. Sending the true type is still preferred, and it is the only signal available for a path
with no extension.

> One exception: do **not** send `Content-Type: application/json` for a raw-bytes upload. That content
> type selects the JSON body form documented below, and the request will be parsed as JSON rather than
> stored as bytes. Upload `.json` files with `application/octet-stream` (the extension is enough) or use
> the JSON/base64 form.

**Response** `201` for opaque/non-document files (`{ path, sha256 }`). For a **document or media** format that triggers async conversion/embedding (PDF, DOCX, images, audio, …) the response is **`202 Accepted`** with an `embeddingStatus: "pending"` — the file is stored immediately and its searchable content is produced in the background (poll File Meta or retry-embedding for status):

```json
{ "path": "reports/q1.pdf", "sha256": "a1b2c3...", "embeddingStatus": "pending" }
```

### Upload a File (JSON / base64)

```http
POST /api/files/:spaceId?path=assets/diagram.svg
Content-Type: application/json

{
  "content": "PHN2ZyB4bWxucz0...",
  "encoding": "base64"
}
```

---

### Chunked Upload (Content-Range)

For files larger than 10 MB, split into chunks and send with `Content-Range`:

```http
POST /api/files/:spaceId?path=large-file.zip
Content-Type: application/octet-stream
Content-Range: bytes 0-5242879/15728640
Authorization: Bearer ythril_…

<5 MB of raw bytes>
```

Intermediate chunks return **202**:

```json
{ "path": "large-file.zip", "received": 5242880 }
```

The final chunk (where `end === total - 1`) returns **201** with the full file hash:

```json
{ "path": "large-file.zip", "sha256": "a1b2c3..." }
```

Duplicate ranges are silently accepted (idempotent). The `maxUploadBodyBytes` config limit applies per-chunk; the declared `Content-Range` total is bounded by `maxChunkedUploadBytes` (default 10 GiB → **413** when exceeded). Every chunk is also checked against the storage quota — the first chunk projects the full declared total — and returns **507** when the files hard limit would be exceeded. Bytes staged under `.chunks` count toward measured file usage.

### Check Upload Progress

```http
GET /api/files/:spaceId/upload-status?path=large-file.zip&total=15728640
```

**Response** `200`:

```json
{ "received": 5242880 }
```

Resume by sending the next chunk from the `received` offset. Stale chunk directories (older than 24 hours) are automatically cleaned up.

---

### Download a File

```http
GET /api/files/:spaceId?path=reports/q1.pdf
```

Returns raw file bytes. Works with any file type — PDFs, images, archives, source code, etc. If `path` is a directory, returns a JSON listing.

Active-content types that can execute script when rendered in the browser (`.html`, `.htm`, `.svg`, `.xml`, `.xhtml`) are served with `Content-Disposition: attachment` and a `sandbox` Content-Security-Policy (stored-XSS guard). Passive types — images, PDF, plain text — are served `inline` and preview normally.

---

### List Directory

```http
GET /api/files/:spaceId?path=reports/
```

**Response** `200`:

```json
{
  "path": "reports/",
  "type": "dir",
  "entries": [
    { "name": "q1.pdf", "type": "file", "size": 204800, "embeddingStatus": "complete", "tags": ["finance"] },
    {
      "name": "q1-data.xlsx", "type": "file", "size": 51200, "embeddingStatus": "processing",
      "progress": { "step": "vlm", "steps": ["render", "vlm", "repair"], "done": 12, "total": 40 },
      "progressAt": "2026-07-27T15:04:11.204Z"
    },
    { "name": "charts", "type": "dir", "size": 819200 }
  ]
}
```

A directory's `size` is the recursive sum of everything beneath it. Files carry their `embeddingStatus` and
`tags` from the file's metadata record.

**`progress` / `progressAt` are present only while a file is in flight** (`pending`/`processing`) *and* its
worker has reported at least one step:

- `steps` is the route **this** file is taking, not a fixed list — it differs per file type and per the
  space's effective extraction level, so a client can render exactly the stages that will really run.
- `step` is the one running now; `done`/`total` are units within it (pages, usually) and are **absent for
  stages that are not divisible** — render those as indeterminate rather than inventing a fraction.
- `progressAt` is the last sign of life. Treat a file whose `progressAt` is older than the stall timeout as
  **stalled**, not working — that distinction is the whole point of the field.

Absence means "not known yet", **not** "no work to do": a job claimed a moment ago has no `progress` until
its first report. Fall back to `embeddingStatus` rather than rendering an empty progress indicator. The
lookup is best-effort server-side, so these fields may also be absent if the job store was briefly
unreachable — the listing itself never fails over them.

---

### Create Directory

```http
POST /api/files/:spaceId/mkdir?path=reports/charts
```

**Response** `201`:

```json
{ "created": "reports/charts" }
```

---

### Move / Rename

```http
PATCH /api/files/:spaceId?path=reports/draft.docx
Content-Type: application/json

{ "destination": "reports/final.docx" }
```

**Response** `200`:

```json
{ "from": "reports/draft.docx", "to": "reports/final.docx" }
```

---

### Delete a File

```http
DELETE /api/files/:spaceId?path=reports/q1.pdf
```

**Response** `204`.

To delete a directory, include `{ "confirm": true }` in the request body.

Deleting a file cascades: its metadata record, any queued embedding job, and all conversion
artifacts — chunk records plus the on-disk `_converted/<id>.md` and `_extracted/<id>/` sidecars —
are removed from the file store. Deleting a **directory** does the same for every file beneath it,
including the `_converted/<path>` and `_extracted/<path>` subtrees, and writes a sync **tombstone**
per removed file so peers delete their copies too (otherwise the next sync would push them back).

**Soft-delete (`softDeleteFileMeta`).** With this top-level config flag set to `true` (default
`false`), deleting a file **retains** its metadata record and flags it `deletedAt = <timestamp>`
instead of removing it. Flagged records stay listed and searchable but are shown as "deleted" in the
UI; re-uploading the same path clears the flag. Derived records (conversion chunks / `_converted` /
`_extracted`) are always hard-removed regardless of the setting.

**Metadata-only delete + guard.** `DELETE /api/brain/spaces/:spaceId/files?path=…` removes a metadata
record *without* touching disk — but only when doing so is safe. If the file **still exists on disk**
and the record is not flagged deleted, the request is refused with **`409`** (deleting the metadata
would silently orphan a live file — delete the file itself instead). A flagged or already-orphaned
record (its file gone) can be purged this way.

---

### Server-Side Conversion Pipeline

When a convertible file is uploaded, Ythril automatically:

1. Converts it to clean Markdown (via unstructured sidecar for PDF/DOCX/EPUB, or in-process for HTML/MD/TXT).
2. Normalises the Markdown (strips page numbers, collapses blank lines, levels headings).
3. Splits it into heading- or paragraph-delimited chunks.
4. Embeds each chunk independently for high-quality semantic recall.

#### Timing — conversion is asynchronous

**Every** write path enqueues the conversion for a background worker and returns immediately; the
chunks do not exist yet when the call returns. This is true for the REST upload **and** for the MCP
`write_file` tool — the two behave identically.

| Surface | Returns | How to know conversion finished |
|---------|---------|--------------------------------|
| `POST /api/files/:spaceId` (document formats) | `202 Accepted` with `embeddingStatus: "pending"` — or `201` with `embeddingStatus: "skipped"` when document extraction is `off` for that space | poll the filemeta record |
| MCP `write_file` | the write confirmation (sha256) — it reports the **write**, not the conversion | poll the filemeta record |

Poll `GET /api/brain/spaces/:spaceId/files?path=<path>` and watch `embeddingStatus`: `pending` →
`processing` → `complete` (`partial` means some chunks failed and are retry-eligible; `failed` means
retries are exhausted). Once complete, the record carries `chunkCount` and (for binary formats)
`convertedFileId`, and the chunk records are recall-searchable. To see the chunks themselves, pass
`?includeChunks=true` — they are hidden by default (see below).

**While a file is in flight the record also carries step progress**, so a caller can report *which
stage* is running rather than just that something is:

```json
{
  "embeddingStatus": "processing",
  "progress": { "step": "vlm", "steps": ["ocr", "render", "vlm", "validate"], "done": 12, "total": 40 },
  "progressAt": "2026-07-22T12:00:00.000Z"
}
```

`steps` is the resolved route for **that document** — it differs per file and per extraction level, so
do not treat it as a fixed list. `done`/`total` are present only for stages that can count their work;
a stage that is one indivisible call reports neither, and inventing a midpoint for it would be
fabricated progress. `progressAt` is the last report, which is what distinguishes a slow job from a
wedged one — compare it against `stalledJobTimeoutMs`. Both fields are absent once the job finishes,
and while a claimed job has not yet reported its first step.

Media files (image/audio/video) are likewise queued and report `embeddingStatus` of `pending`,
`disabled` (media embedding turned off) or `skipped` (over `maxFileSizeBytes`). Only the `"text"`
bypass is fully synchronous: it stores a single flat embedding with no chunking and no job.

> Agents take note: writing a document and immediately recalling its contents will find nothing —
> the worker has not run yet. Poll `embeddingStatus`, or accept eventual consistency. (Before Ythril
> 1.4, MCP `write_file` converted documents inline and blocked until they were chunked; it now
> enqueues a job like REST, so it returns faster and inherits the worker's retry/backoff.)

#### `inputFormat` parameter

Pass `inputFormat` in the JSON body (or as a query parameter in raw uploads) to control conversion:

| Value | Behaviour |
|-------|-----------|
| `"auto"` | (default) Detect from MIME type or file extension |
| `"pdf"` / `"docx"` / `"epub"` | Use the unstructured sidecar (same-Pod, localhost:8000) |
| `"html"` | Extract article body with jsdom + @mozilla/readability + turndown, fully in-process |
| `"md"` | Normalise + split on H2/H3 headings, in-process — no sidecar, no `_converted/` copy |
| `"txt"` | Normalise + split on paragraph boundaries, in-process — `headingText` is null on all chunks |
| `"text"` | Legacy bypass: single flat embedding, no chunking, unchanged behaviour |

Example — upload and convert a PDF:

```http
POST /api/files/:spaceId?path=reports/q1.pdf
Content-Type: application/json

{
  "content": "<base64-encoded PDF bytes>",
  "encoding": "base64"
}
```

Or force the bypass (no conversion):

```json
{
  "content": "<base64-encoded PDF bytes>",
  "encoding": "base64",
  "inputFormat": "text"
}
```

#### Stored artefacts

Three things are stored for each converted file (conversion artefacts are **hidden** from the file manager UI and the `GET /api/brain/spaces/:spaceId/files` listing by default):

1. **Original file** — bytes on disk, accessible via the usual download URL. Unchanged.
2. **`_converted/<path>.md`** — full converted Markdown, stored in the space file store (binary formats only). The original file's filemeta record has a `convertedFileId` property pointing to it.
3. **Chunk records** — one filemeta record per heading/paragraph section. Each has:
   - `parentFileId` — `_id` of the original file's filemeta record
   - `chunkIndex` — 0-based position within the document
   - `headingText` — the H2/H3 heading that opened this chunk (`null` for `.txt` paragraph chunks)
   - `content` — the Markdown body of the chunk
   - An embedding derived from `headingText + " " + content`

Chunk records and `_converted/` records share the same vector space as memories, entities, and edges. A standard `recall` query therefore covers document chunks alongside all other content — **no separate query path is required**.

#### File manager and listing endpoints

Chunk records and `_converted/` file records carry a `parentFileId` field. The following surfaces **exclude** them by default, so users only see top-level files:

- **File manager UI** — shows only original, user-uploaded files.
- **`GET /api/brain/spaces/:spaceId/files`** — omits records where `parentFileId` is set. Pass `?includeChunks=true` to include all records.
- **`GET /api/brain/spaces/:spaceId/stats`** — the `files` count reflects only top-level files.

Recall results (`recall`, `find_similar`) **do** include chunk records by design. When a result has `parentFileId` set, the caller can follow it to retrieve the original file record.

#### Resilience

If the unstructured sidecar is unavailable, `write_file` still succeeds. The original file is stored as-is and `conversionError` is set on the filemeta record. No HTTP 5xx is returned to the caller.

Conversion input is size-bounded: documents over `maxDocumentConversionBytes` in `config.json` (default 100 MiB; HTML additionally capped at 25 MiB because jsdom parses it in-process) are stored as-is with `embeddingStatus: "skipped"` — the conversion job fails permanently rather than retrying. Images extracted during hi-res conversion are capped at 50 per document / 100 MiB aggregate.

Setting `CONVERSION_SIDECAR_URL=""` only disables the **sidecar-backed** formats: in-process formats (HTML/Markdown/plain text) still convert, but PDF/DOCX/EPUB uploads then fail with `conversionError: sidecar_down` (`embeddingStatus: failed`). There is no global "text bypass" — to skip conversion for a specific upload, send it with `inputFormat=text`.

#### Page-render sidecar (`doc-render`)

The bundled `doc-render` sidecar is a tiny PDFium (pypdfium2) service that renders PDF pages to images. It is
the rasterization step the **VLM document-extraction** path (`mediaEmbedding.documentProcessing.mode` of
`vlm` / `auto` / `repair`) needs and is **not used by the `ocr` level** — you can leave it running (it is
lightweight and carries no model weights) or stop it with no effect on today's OCR conversion. Like the
`unstructured` sidecar it parses untrusted documents, so it runs isolated on the internal-only
`ythril-convert` network (no database, no internet egress), non-root and resource-limited. Ythril reaches
it via `RENDER_SIDECAR_URL`. The **application** default is `http://localhost:8100` (a sidecar in the same network namespace); `docker-compose.yml` overrides it to `http://doc-render:8100`, the service name on the internal network. Both are correct for their layer — check which one applies to your deployment rather than assuming the compose value is the default.

Two limits are set **on the sidecar**, not in Ythril's config — they bound what an untrusted document can
make it do, so they belong to the process that parses it:

| Env (on the sidecar) | Default | Meaning |
|---|---|---|
| `RENDER_MAX_BYTES` | `104857600` (100 MiB) | Largest document the renderer will accept. |
| `RENDER_MAX_PAGES` | `500` | Hard ceiling on pages rendered per request, whatever `maxPages` asks for. |

#### Office-render sidecar (`doc-office`) — optional

`doc-render` only opens PDFs, so **office** documents (DOCX, EPUB, PPTX, XLSX, ODT, RTF…) in a `vlm`/`auto`/
`repair` fall back to OCR unless the optional **`doc-office`** sidecar is running. It uses **LibreOffice**
(headless) to convert the document to PDF, then rasterizes it exactly like `doc-render`. Because LibreOffice
is heavy (≈ +1 GB), it is **opt-in**: start it with

```bash
docker compose --profile office up -d
```

Everything stays **on-box** on the isolated `ythril-convert` network — no page images or text leave the
instance. Ythril reaches it via `RENDER_OFFICE_SIDECAR_URL` (default `http://doc-office:8100` in compose).
When it is absent, office docs simply use OCR, unchanged. LibreOffice is MPL-2.0 / LGPL-3.0 (not AGPL) and
runs as a separate process, so it does not affect Ythril's licensing.

It honours `RENDER_MAX_BYTES` and `RENDER_MAX_PAGES` exactly as `doc-render` does, plus one of its own:

| Env (on the sidecar) | Default | Meaning |
|---|---|---|
| `OFFICE_CONVERT_TIMEOUT` | `120` | Seconds `soffice` gets to convert the document to PDF before the attempt is abandoned and the upload falls back to OCR. Raise it for very large spreadsheets; a LibreOffice conversion that hangs holds a worker slot until this fires. |

#### Document Processing Configuration

The unstructured sidecar strategy and image extraction behaviour can be tuned under `mediaEmbedding.documentProcessing` in `config.json`. All settings are optional — the defaults are designed for maximum data extraction out of the box. The extraction `mode` and the render DPI / max-pages / timeout / concurrency knobs are also editable in the admin UI under **Settings → Media Processing → Pipelines**, attached to the Documents pipeline they govern (the `vlmModel` / `repairModel` / `verifyModel` endpoints stay environment-only and are shown read-only there).

**The admin page has three tabs**, one route:

- **Models** — every model you or infra can set: text embedding, vision, speech-to-text, the assist model, and read-only cards for the page renderer, document converter and face recognition. One shape per card (provider → endpoint → model → credential → test); infra-owned cards are dashed and name the env var that owns them.
- **Pipelines** — Documents, Images, Audio, Video and Text drawn as their real step chains, with the model doing the work named under each step and a health indicator fed by `GET /api/admin/pipeline-status`. **Clicking a model name jumps to the Models tab and highlights the card that configures it.** Conditional steps (VLM fallback, repair, face vectors, video keyframe captioning) are dashed. Each pipeline's knobs hang off that pipeline, and each carries its own **instance ceiling** picker (see below). **Audio and Video are separate pipelines:** Audio is transcribe → embed; Video extracts the audio track and runs that same pipeline, adding keyframe captioning only at the `full` level (so at `audio` a video uses no vision model).
- **Tools** — the components that run but have nothing to set: media splitter (ffmpeg), text chunker, and the vector index. Per space the index table shows the **live** database state alongside the **recorded** (config.json) state, so drift between them is visible; each row carries a **Rebuild** button (the same `POST /api/spaces/:id/rebuild-indexes` the space Danger Zone offers, behind the same confirmation) so the repair sits right where the drift shows.

Switching tabs with unsaved changes prompts rather than discarding them.

**Infra-managed lock (F11).** On managed infrastructure you can set every media/model value in `config.json` (or the environment) and forbid changes through the admin UI/API — the same posture as `YTHRIL_MONGO_INFRA_MANAGED` for the database. Set `mediaEmbedding.infraManaged: true` in `config.json`, **or** `YTHRIL_MEDIA_INFRA_MANAGED=true` in the environment. When active, `PATCH /api/admin/media-config` returns **409** with `code: "INFRA_MANAGED"` and **Settings → Media Processing** renders read-only (a "managed by infrastructure" banner is shown; *Test connection* still works). Individual fields can instead be pinned one at a time by setting their env var (e.g. `VISION_MODEL`, `DOC_ASSIST_URL`) — those appear in `lockedByInfra` and are locked individually. Use `infraManaged` when the whole block is owned by infrastructure.

**Test connection (F11).** `POST /api/admin/media-config/test-connection` (admin + MFA) probes a configured endpoint — `{ "target": "vision" | "stt" | "assist" | "embedding" | "nli" }` — by listing its models. It performs **no inference and sends no document content**, so it is safe to run before acknowledging egress. External endpoints go through the SSRF-guarded fetch; local (trusted) endpoints use a direct fetch. The response reports `{ reachable, verdict, modelEnumerated?, models, status?, latencyMs, detail? }`. Settings → Media Processing exposes a **Test connection** button per provider card.

`verdict` is what the probe **established**, and it is the field to branch on — `reachable` cannot separate
an endpoint that answered a 404 on the list path from one that did not answer at all:

| `verdict` | meaning | fault? |
|---|---|---|
| `listed` | the endpoint served a model list | no |
| `not-enumerable` | it answered with a 4xx on the list path: present, speaking HTTP, no listing surface | **no** — see below |
| `auth-rejected` | 401/403 — the credential was rejected, and inference presents the same one | yes |
| `erroring` | 5xx — the server is there and erroring, which is about the endpoint, not the path | yes |
| `unreachable` | nothing answered: connection refused, DNS, TLS, timeout | yes |

The list URL is derived from the **same rule the inference call uses** — `/models` for an OpenAI-compatible
base (which already carries `/v1`; `…:8080` and `…:8080/v1` both work), `/api/tags` for a local Ollama. A
probe that normalised differently from the thing it probes would report a red dot over a working pipeline,
or worse, a green one over a broken pipeline. If the endpoint answers on the *other* protocol, the probe
says so explicitly rather than simply failing — that means the provider type is set wrong and inference
will fail even though the endpoint is up.

> **`modelEnumerated: false` is not a fault.** It means the endpoint did not *list* the configured name,
> which is normal and deliberate for aliasing routers (llama-swap roles), gateways and Azure deployments —
> they serve names they keep out of user-facing pickers. Absence from a list is not evidence a model is
> unavailable, so it is reported as informational and never as degraded. To find out whether a model
> actually answers, make a real request — which is what Verify does.
>
> **`verdict: "not-enumerable"` is not a fault either**, for the same reason one step further out. A model
> list is a *surface*, and plenty of inference servers do not have one: a Whisper transcription service
> serves only `POST /v1/audio/transcriptions`, so a list probe against it can only ever 404. That 404 is
> about a path the slot never calls — it is no evidence about the slot. It is reported as reachable with
> the status and the URL in `detail`, and the Models card shows *"Reachable · no model list"*.
>
> A genuine fault still reads as one: a refused connection, a DNS or TLS failure, a 5xx, or a rejected
> credential. And if the base URL is simply wrong, `detail` names the exact URL that was tried, which is
> the thing to check when extraction produces nothing while the dot is green — or run Verify, which sends
> a real request down the real path and is the only thing that can settle it.

**Verify.** `POST /api/admin/media-config/verify` (admin + MFA) — `{ "target": "vision" | "stt" |
"embedding" | "assist" }` — sends **one real request** to the configured model and reports what came back.
It is the counterpart to Test connection, and it answers the question listing models cannot: *does this
model actually work?*

The payload is always **generated, never yours**: a 1×1 transparent PNG for vision, a few milliseconds of
synthesised silence for speech-to-text, the word `ping` for text models. That matters because for several
targets the real path is an egress path, and a diagnostic must not become one. It exercises the same
client the worker uses — same wire format, same SSRF guard, same model name — so a transport bug shows up
here rather than on a user's first upload.

| `outcome` | meaning |
|---|---|
| `ok` | the model answered; `sample` carries a truncated excerpt as evidence |
| `failed` | it was reached and did not produce a usable answer; `detail` says why |
| `still-loading` | no answer within the budget — **not a failure** |
| `unconfigured` | nothing is set for that target |

> **`still-loading` exists because a cold start is not a fault.** On a backend that swaps models in and
> out of one GPU, a first call has been measured at ~35 seconds. The budget is 180 s
> (`MODEL_VERIFY_TIMEOUT_MS`), and exceeding it means "try again", not "your endpoint is broken".

Unlike Test connection, Verify **is audited** (`config.media.verify`): it leaves the instance and, on a
metered endpoint, costs money. Silence transcribing to no text counts as a pass — the payload is silent,
so reaching a structured response is the result.

**Pipeline status.** `GET /api/admin/pipeline-status` (admin) returns the health of the whole pipeline in one read-only payload — it mutates nothing and sends no document content. It reports three things:

- `sidecars[]` — reachability of the document converter, page renderer and office renderer, each with the env var that owns its URL (`CONVERSION_SIDECAR_URL`, `RENDER_SIDECAR_URL`, `RENDER_OFFICE_SIDECAR_URL`).
- `models[]` — per stage (`embedding`, `vision`, `stt`, `doc-vlm`, `doc-repair`, `doc-verify`, `assist`): the configured model, the endpoint **host** (never the full URL), and a `state` of `ok` / `degraded` / `down` / `blocked` / `off` / `unconfigured`. `degraded` means the endpoint answered **and something the probe saw says the configured call will fail anyway** — today, an endpoint answering on the other protocol, which means the provider type is set wrong; `detail` carries the reason. `down` covers both "nothing answered" and an answer that is itself a fault (a 5xx, or a rejected credential). An endpoint with no model-list route is `ok` with the reason in `detail` — that 404 is about a path the stage never calls. `unconfigured` means nothing is set: an optional stage left empty is not reported as a fault. API keys authenticate the probes and never appear in the response.
- `index.spaces[]` — per space, the **live** `$vectorSearch` index state read from MongoDB (`live`) alongside what `config.json` claims (`stored`), plus a `drifted` flag when `stored` says `ready` and the database disagrees. Proxy spaces own no collections and are omitted. A deployment whose MongoDB has no Atlas Search support reports `unknown` rather than `missing`.

Results are cached for 20 seconds and single-flighted, so several admins on **Settings → Media Processing** produce one set of probes rather than one per viewer per step. Stages sharing an endpoint (typically `doc-vlm` / `doc-repair` / `doc-verify` on one Ollama) are probed once.

**Per-space override (F11-c).** The `mode` above is a **ceiling, not a default**: a space may choose anything up to it and nothing beyond it. Set the override from the space's **Settings → Document extraction** picker, or via `PATCH /api/spaces/:id` with `{ "documentExtraction": "off" | "ocr" | "vlm" | "repair" | "auto" }` (send `null` to clear it and follow the instance setting again). A request **above** the ceiling is **capped to the ceiling** before it is stored — the API never persists a level the runtime would only clamp later, and the Settings picker offers only the modes at or below the ceiling. Like dupe rules and record-TTL, this is a **local, per-instance** operational setting: it is never governed or synced across a network.

The effective level is `min(instance mode, space override)`, which has three consequences worth stating outright:

- **Lowering the instance mode caps every space above it.** A space set to `"repair"` under an instance on `"ocr"` runs `"ocr"`. The space keeps its stored choice and returns to it if the ceiling rises again.
- **Raising the instance mode does not raise any space** that chose a specific lower level — only spaces on `"auto"` follow it upward. Capability is granted centrally; using less of it stays with the space.
- **Instance `"off"` is a floor as well as a ceiling.** Nothing is analysed anywhere, whatever a space asks for.

A space on `"auto"` follows the instance level wherever it moves.

**The other media classes work the same way.** `PATCH /api/spaces/:id` also accepts `imageAnalysis`,
`audioAnalysis` and `videoAnalysis` (send `null` to clear an override), each capped by the matching
ceiling under `mediaEmbedding.levels`:

| Class | Levels, low to high | `off` means |
|---|---|---|
| `imageAnalysis` | `off` · `caption` · `recognition` · `auto` | no caption, no image embedding, no face detection |
| `audioAnalysis` | `off` · `on` · `auto` | no transcription |
| `videoAnalysis` | `off` · `audio` · `full` · `auto` | no audio extraction, no transcription |
| `textAnalysis` | `off` · `embed` · `chunk` · `auto` | text is never indexed — nothing in the file is findable by search |

**Setting the ceilings.** `PATCH /api/admin/media-config` accepts a `levels` block — `{ "levels": { "images": "caption" } }` — or use the pickers on **Settings → Media Processing → Pipelines**. Three things about it are deliberate:

- **Each class is merged independently.** A patch naming only `images` leaves the other three exactly as they were. This matters more than it looks: an absent class reads back as `auto`, so a whole-object replace would silently *raise* the ceiling on every class the request did not mention.
- **Video's `audio` vs `full` is a real choice.** At `audio` a video "takes the audio pipeline instead of a model": its audio track is transcribed and embedded, and the vision model is never called. At `full` (and `auto`, which resolves to full) it additionally captions sampled keyframes with the vision model and folds those into the transcript segments. Both are accepted and stored.
- **Env-pinned levels are refused** with `403` and reported in `lockedByInfra`, like every other media field.

Remember what a ceiling does before lowering one: it caps every space already above it (those spaces keep their stored choice and return to it if you raise the ceiling again), and `off` is a floor as well as a ceiling — the class is not processed anywhere, whatever a space asked for.

`recognition` is the rung that permits **face detection and embedding**, and it is the gate: the space
must be at `recognition` (or `auto`) under an instance ceiling that permits it. A space on `caption` gets
described images and no face data — the reason images have their own ladder rather than riding on the
master media switch. **Images default to `caption`, not `auto`**: `auto` resolves to `recognition`, and a
biometric store should be opted into rather than inherited from a default. `mediaEmbedding.faceRecognition.enabled`
is no longer a user setting — it survives only as an infra pin (`FACE_RECOGNITION_ENABLED=false`) that
hard-disables faces regardless of any ladder, and it is not accepted by `PATCH /api/admin/media-config`.

`textAnalysis` decides what happens to text AFTER a document is read, which is a separate question
from how it was read (`documentExtraction`). `chunk` stores a vector per section, so a recall can
quote the passage; `embed` stores one vector for the whole document, which still finds the FILE but
no longer answers "where does it say that?" — a real trade on long documents, and close to free on
short notes. `off` stores the file and indexes nothing.

`videoAnalysis` chooses how much of a video is analysed. `audio` runs the **audio pipeline only** —
extract the audio track, transcribe, embed — so a video is searchable by what is said without ever
invoking the vision model. `full` adds **keyframe captioning**: frames are sampled at an interval,
captioned by the vision model, and prepended to the transcript segment they overlap before re-embedding.
`auto` resolves to `full`. (Video is its own pipeline on **Settings → Media Processing → Pipelines**, separate
from Audio.)

Uploads to a class whose effective level is `off` are stored and marked `embeddingStatus: "skipped"`.
They are never queued, so they do not sit at `pending` waiting for work that will not happen. Uploads to a space whose effective level is `"off"` are stored and marked `embeddingStatus: "skipped"` — they are never queued, so they do not sit at `pending` waiting for work that will not happen.

| Field | Default | Description |
|---|---|---|
| `strategy` | `"hi_res"` | Unstructured partition strategy. `"hi_res"`: full Tesseract OCR + layout detection — accurate on scanned PDFs, extracts embedded images and structured tables. `"auto"`: sidecar picks the fastest viable strategy. `"fast"`: pdfminer text-layer only — fastest but no OCR, no image extraction. `"ocr_only"`: force OCR on every page regardless of whether a text layer exists. |
| `extractImages` | `true` | When `true` and `strategy` is `"hi_res"`, embedded images found in document partitions are decoded and saved as `_extracted/{originalId}/image-{N}.{ext}` subfiles. Each is automatically enqueued for the full media pipeline (caption + face recognition). Has no effect when strategy is not `"hi_res"`. |
| `mode` | `"vlm"` | How thoroughly documents are read, low to high: `"off"` · `"ocr"` · `"vlm"` · `"repair"`, plus `"auto"`. **`"off"` means documents are stored but never analysed** — no text is extracted, so nothing in them can be recalled; those uploads are recorded as `skipped` rather than queued. `"ocr"` is OCR-only (the unstructured sidecar). `"vlm"` renders each page and transcribes it with a vision model, using OCR as grounding evidence and falling back to OCR if the result doesn't validate (so it is **never worse than OCR**). `"repair"` adds a validation-driven **repair** pass (below) on top of `"vlm"`, plus a second-model consensus pass when a `verifyModel` is set. `"auto"` means **as much as this instance can actually do** — it resolves to `"repair"` when a repair model is configured, otherwise `"vlm"`, otherwise `"ocr"`, so with no `vlmModel` set it is byte-for-byte the OCR-only path. `"max"` is the previous name for `"repair"` and is still accepted on read. |
| `vlmModel` | `""` | Ollama vision model used for `vlm` / `auto` / `repair` (e.g. a bundled `moondream`, or a larger model you wire in). Empty ⇒ the VLM path is unavailable and extraction stays on OCR. Env override: `DOC_VLM_MODEL`. |
| `vlmBaseUrl` | `""` | Endpoint for the VLM. Empty ⇒ falls back to the media vision provider's `baseUrl`, then `http://ollama:11434`. Env override: `DOC_VLM_URL`. **Setting this marks the slot as a separate service**, so the call goes through the SSRF-guarded fetch — a private address then needs `allowPrivateModelEndpointsBySlot.docVlm` (or the instance-wide flag). |
| *(no config key)* | — | `DOC_VLM_WIRE` — which protocol the document VLM speaks: `ollama` (`/api/chat`) or, by default, `openai` (`/chat/completions`). Env-only, because the URL cannot tell us: `http://host:11434` is either. The default matches what self-hosted inference servers overwhelmingly serve; set `DOC_VLM_WIRE=ollama` only when you point `DOC_VLM_URL` at a **separate Ollama**. It applies to all three document slots, which share one endpoint resolver. |
| `repairModel` | `""` | Used by the **`repair`** level — and by **`auto`**, which resolves to `repair` whenever this is set. Model used for the repair pass when a page's VLM output fails OCR-evidence validation — it reconciles the draft against the OCR text in one extra text-only call. Empty ⇒ reuses `vlmModel`. Set this to wire in a stronger model you host. Env override: `DOC_REPAIR_MODEL`. |
| `repairBaseUrl` | `""` | Endpoint for the repair model. Empty ⇒ reuses `vlmBaseUrl`. Env override: `DOC_REPAIR_URL`. |
| `verifyModel` | `""` | Engages on the **`repair`** level, and on **`auto`** when a repair model is set (F11-d consensus). A *second* document VLM. When set, the repair level runs it as an independent second transcription of each page, reconciles it with the primary draft against the OCR text, and keeps the highest-coverage result — **never worse** than the primary. Empty ⇒ no consensus pass. Best set to a *different* model than `vlmModel`. Env override: `DOC_VERIFY_MODEL`. |
| `verifyBaseUrl` | `""` | Endpoint for the verify model. Empty ⇒ reuses `vlmBaseUrl`. Env override: `DOC_VERIFY_URL`. |
| `renderDpi` | `150` | Page rasterization DPI for the render sidecar (VLM modes only). |
| `maxPages` | `50` | Pages rendered per **render call** — one sidecar round trip's memory/latency bound. Not how much of a document is read: longer documents are walked in windows of this size. |
| `maxTotalPages` | `200` | Pages read from **one document** in total, across windows. Beyond this the extraction stops and says so, in the log and in the stored markdown. |

> **Why two numbers.** They bound different things. `maxPages` is one round trip; `maxTotalPages` is the
> job's cost ceiling — every page is a VLM call, so an unbounded walk over a 600-page scan means 600 model
> calls and, with an external endpoint, 600 pages of content leaving the instance, on an upload nobody is
> watching. Raise `maxTotalPages` deliberately. In `max` mode the consensus pass is skipped for a document
> that had to be walked, since it re-transcribes every page with a second model.
| `pageTimeoutMs` | `60000` | Per-page VLM transcription timeout (VLM modes only). |
| `concurrency` | `2` | How many pages are transcribed in parallel (VLM modes only). |
| `ocrTimeoutMs` | `120000` | Timeout (ms) for a single OCR-sidecar call. Applies to **all** modes — OCR is the engine in `ocr` mode and the grounding evidence + fallback floor in the VLM modes — so raise it when large/complex scanned documents need longer than the 2-min default (especially under `repair`). Env override: `DOC_OCR_TIMEOUT_MS`. |

The VLM modes require both a running `doc-render` sidecar and a configured `vlmModel`. If either is missing,
Ythril transparently uses OCR — no upload fails because a model isn't wired in yet.

**Repair pass (`repair` level).** When a document's VLM transcription fails the OCR-evidence coverage check,
the `repair` level runs one bounded repair pass before falling back to OCR: it sends the draft transcription and the
OCR text to `repairModel` (or `vlmModel` if unset) in a single text-only call, asks it to restore any dropped
content, and re-validates. If the repaired output passes it is accepted; if it errors or still doesn't pass,
the extractor falls back to OCR — so the result is still never worse than plain OCR. Exactly one repair pass
runs per document (bounded cost).

**Consensus pass (`repair` level, F11-d).** When a `verifyModel` is configured, the `repair` level adds one bounded
**consensus** step on top of an already-accepted draft: the verify model independently transcribes the pages
(a second, ideally different, VLM), that draft is reconciled with the primary against the OCR text, and the
highest-OCR-coverage of the three candidates (primary, second draft, reconciled) is kept. Because the primary
is always a candidate and ties keep it, consensus **can only match or beat** the primary's coverage — never
regress it. It is failure-tolerant (any error keeps the primary) and bounded (one extra transcription set +
one reconcile call, subject to the same max-pages cap). Empty `verifyModel` ⇒ no consensus pass, unchanged
behaviour. Consensus arbitrates by OCR-evidence coverage; N-pass entropy voting is a possible future refinement.

**External face-recognition model — biometric egress, opt-in and acknowledged.** Face detection and
embedding run **in-process** by default (BlazeFace + FaceRes from `faceRecognition.modelPath`); no face
data leaves the instance. You can optionally point at an external recogniser under
`faceRecognition.externalModel`:

| Field | Description |
|---|---|
| `baseUrl` | Endpoint receiving `POST { model?, image }` (`image` is base64) and returning `{ faces: [{ embedding, boxRaw? }] }`, where `embedding` is **exactly 128 floats**. SSRF-validated on save and reached only through the SSRF-guarded fetch. |
| `model` | Optional model name, passed through in the request body. |
| `apiKey` | Sent as `Authorization: Bearer`. Stored in `secrets.json`, masked on read, never echoed back. |
| `acknowledgedHost` | The host you consented to. **Must equal `baseUrl`'s host or the endpoint is not used at all.** |

Three properties worth knowing before enabling it:

- **Consent is mandatory and host-scoped.** Face crops are biometric data. The API rejects a save whose
  `acknowledgedHost` does not match, and the runtime re-checks it — so a config edited on disk cannot
  egress faces either. Re-pointing `baseUrl` at a different host revokes consent by construction.
- **In-process stays the fallback.** An unreachable, erroring or malformed provider falls back to local
  recognition rather than dropping faces silently.
- **A provider's answer is not trusted.** Descriptors that are not exactly 128 finite floats are
  discarded (a wrong width would corrupt gallery similarity rather than fail loudly), and the number of
  faces accepted from one response is capped.

**External assist model (F11-b) — hosted egress, opt-in and acknowledged.** With the bundled models, every
extraction path is local (the bundled Ollama VLM / OCR sidecar) and no document content leaves your
instance. Note the precondition: the document VLM falls back to the **vision** endpoint when `DOC_VLM_URL`
is unset, so an external vision provider makes the VLM external too and rendered page images go with it —
see the egress table above. You can optionally point a **bigger, external model** at specific tasks under
`documentProcessing.assistModel`:

| Field | Description |
|---|---|
| `baseUrl` | External **OpenAI-compatible** endpoint (`POST {baseUrl}/chat/completions`, with `/v1` inserted if the base does not already carry it — `…:8080` and `…:8080/v1` both work). Validated against SSRF on save (must be a public http(s) URL — no private/loopback/metadata addresses) and reached only through the SSRF-guarded fetch. Env: `DOC_ASSIST_URL`. |

> **Self-hosting inference on a private address?** The `local` / `external` choice selects a **wire
> protocol**, not a trust level: `local` speaks Ollama's (`/api/chat`), `external` speaks OpenAI's
> (`/chat/completions`, `/v1/embeddings`, `/v1/audio/transcriptions`). A self-hosted OpenAI-compatible
> server — llama.cpp `llama-server`, vLLM, LocalAI — therefore needs `external`, even when it lives on a
> cluster address like `http://vllm.models.svc.cluster.local:8080`.
>
> Set **`allowPrivateModelEndpoints: true`** in `config.json`, or `YTHRIL_ALLOW_PRIVATE_MODEL_ENDPOINTS=true`,
> to permit that. It is config/env only and deliberately **not** settable through
> `PATCH /api/admin/media-config` — a field that becomes an egress target must never be widenable from
> the admin API.
>
> Enabling it does **not** disable the SSRF guard. Those calls still go through `ssrfSafeFetch`, which
> resolves DNS, pins the resolved IP for the connection and re-validates every redirect; only the
> private-address rejection lifts. Loopback, link-local / cloud metadata (IMDS) and the `localhost` /
> `metadata.google.internal` hostnames stay blocked either way — including when a hostname *resolves* to
> one, which is the DNS-rebinding case. A declared-private `external` endpoint is therefore more tightly
> guarded than a `local` provider, which uses a plain `fetch`.
>
> **Per endpoint, when one model is genuinely external.** The instance-wide flag is all-or-nothing, which
> is the wrong shape for the common deployment: every model on your own infra except one that really does
> live on the public internet. Turning the flag on to reach the internal ones also relaxes the guard on
> that one external endpoint — the single place where a private-address resolution means something is
> wrong rather than "this is my cluster". So each endpoint carries its own setting:
>
> ```json
> {
>   "allowPrivateModelEndpoints": true,
>   "allowPrivateModelEndpointsBySlot": { "assist": false }
> }
> ```
>
> **Precedence is per-slot → instance-wide → closed**, and a per-slot value wins **in both directions**.
> The `false` above is the point of the example: nine endpoints reach the cluster, and the assist model —
> the one path that sends document content off the instance — stays strict. Slots you leave out inherit
> the instance-wide flag; with neither set, private addresses are refused.
>
> | Slot | What it governs | Env var |
> | --- | --- | --- |
> | `vision` | Image captioning provider | `YTHRIL_ALLOW_PRIVATE_VISION` |
> | `stt` | Speech-to-text provider | `YTHRIL_ALLOW_PRIVATE_STT` |
> | `embedding` | Text embedding endpoint | `YTHRIL_ALLOW_PRIVATE_EMBEDDING` |
> | `rerank` | Cross-encoder reranker | `YTHRIL_ALLOW_PRIVATE_RERANK` |
> | `nli` | Contradiction judge | `YTHRIL_ALLOW_PRIVATE_NLI` |
> | `docVlm` | Document page transcription | `YTHRIL_ALLOW_PRIVATE_DOC_VLM` |
> | `docRepair` | Document repair pass (local model) | `YTHRIL_ALLOW_PRIVATE_DOC_REPAIR` |
> | `docVerify` | Document verify pass | `YTHRIL_ALLOW_PRIVATE_DOC_VERIFY` |
> | `assist` | External assist model (F11-b) | `YTHRIL_ALLOW_PRIVATE_ASSIST` |
> | `faceExternal` | External face recogniser | `YTHRIL_ALLOW_PRIVATE_FACE_EXTERNAL` |
>
> The env vars accept `true` **or** `false` — unlike the instance-wide one, a `false` here is meaningful,
> because it is how you pin one endpoint strict from the Deployment. Anything other than those two exact
> strings is not a setting and defers to the instance-wide flag. Like the instance-wide flag, none of these
> is settable through the admin API.
>
> No per-slot setting reaches the crown jewels: loopback, link-local / cloud metadata and the unspecified
> address stay blocked for every slot, at both save time and resolution time.
>
> The instance reports this in its startup security posture and at `GET /api/about/security`:
> `egress.privateModelEndpoints` (endpoints the permission is actually being used for),
> `egress.unreachableModelEndpoints` (endpoints configured privately with **no** permission for their slot
> — these cannot work, and fail silently at inference rather than at save), and
> `egress.perSlotOverrides` (slots whose setting departs from the instance-wide flag, so the one endpoint
> you deliberately kept strict is visible rather than implied). All three can appear at once, which is
> exactly what a mixed estate looks like.
>
> **Reading that posture line when your endpoints are DNS names.** The check is synchronous and does
> **not** resolve DNS — resolving at boot would make the posture block hang on a slow resolver. An
> endpoint written as a hostname is therefore reported as `(hostname, not resolved here)`, which means
> *unknown*, not *public*. On a cluster where every endpoint is a `*.svc.cluster.local` name, none of
> them will be counted as private, and that is not evidence that the permission is unused. Only
> endpoints written as IP literals can be classified from configuration alone.
>
> **When a call is refused, the server says so.** Every SSRF refusal writes one `warn` line naming the
> target, the address it resolved to, and the setting that would permit it — so a blocked endpoint is
> diagnosable from the container log, not only from whatever a dialog happened to show. The line is
> redacted like any other, so a key in a query string is not echoed into the log.

| `model` | Model tag to request. Env: `DOC_ASSIST_MODEL`. |
| `apiKey` | Optional bearer token. Stored in `secrets.json` (never `config.json`), masked in the admin API. Env: `DOC_ASSIST_API_KEY`. |
| `uses` | Which tasks the external model powers — `["repair"]` today (the repair pass); more are planned. Empty ⇒ configured but inert (no egress). |
| `acknowledgedHost` | The endpoint host the operator acknowledged egress to. **Required to match `baseUrl`'s host whenever `uses` is non-empty** — the admin API rejects the save otherwise, and the extractor re-checks it at runtime, so document content never leaves the box without recorded consent. |

⚠️ **This is the only setting that sends document content off the instance.** When a task is assigned, the
external model receives OCR-extracted text and draft transcriptions (and, for future image-based tasks,
rendered page images). Settings → Media Processing surfaces an **acknowledgment dialog** on save that states exactly
what egresses to which host; that acknowledgment sets `acknowledgedHost`. Pinning `DOC_ASSIST_URL` (etc.) via
env locks the whole block read-only in the UI. When no assist model is configured, or its `uses` is empty, the
repair pass stays entirely local exactly as before.

**Example `config.json` excerpt:**

```json
{
  "mediaEmbedding": {
    "documentProcessing": {
      "strategy": "hi_res",
      "extractImages": true
    }
  }
}
```

To revert to the old `auto` behaviour (text extraction only, no images):

```json
{
  "mediaEmbedding": {
    "documentProcessing": {
      "strategy": "auto",
      "extractImages": false
    }
  }
}
```

#### Extracted Image Subfiles

When `strategy: "hi_res"` and `extractImages: true`, Ythril creates one extra stored artefact per embedded image found in a document:

- **`_extracted/{originalId}/image-{N}.{ext}`** — decoded image bytes written to the space file store. `N` is a 0-based index within the document. The extension (`png`, `jpg`, etc.) is derived from the MIME type reported by the sidecar.
  - `parentFileId` is set to the original document's filemeta `_id`.
  - The record is hidden from the file manager UI and listing endpoints by default (same as chunks and `_converted/` files). Two independent filters implement this, and both have an opt-out: derived *records* are excluded from the file-meta listing unless `?includeChunks=true`, and the `_converted/` and `_extracted/` *directories* are excluded from the file-store listing unless `?includeDerived=true`. Only at the space root, where the pipeline writes them — a directory of your own with the same name deeper in the tree is left alone.
  - Immediately enqueued for the media embedding pipeline — the image will be captioned and face-searched automatically.

This means a PDF containing five embedded photographs will produce:

- The original PDF file record
- A `_converted/{id}.md` Markdown record
- One chunk record per heading/paragraph section
- Five `_extracted/{id}/image-{N}.jpg` records, each independently captioned and face-searched

---

### Media Embedding Pipeline (Images, Audio, Video)

Binary media files (images, audio, video) are automatically captioned or transcribed and embedded into the vector space for semantic recall. The pipeline is **enabled by default** — the bundled workstation `docker-compose.yml` and the Kubernetes manifests both ship with the required `ollama` (vision) and `whisper` (STT) services. To disable it (or point Ythril at external providers), use **Settings → Media Processing** in the web UI or `PATCH /api/admin/media-config`.

#### Overview

| Media type | Processing |
|---|---|
| Images (PNG, JPEG, GIF, WebP, …) | Caption via Ollama-compatible vision model → embed caption |
| Audio (MP3, WAV, OGG, FLAC, …) | Silence-detect → STT chunks via Whisper-compatible API → embed each chunk |
| Video (MP4, MKV, MOV, WebM, …) | Extract audio → STT → embed; at the `full` level also caption sampled keyframes and fold them into the transcript segments (at `audio` the vision model is not used) |

All media ultimately produces text that passes through the same `nomic-embed-text-v1.5` embedding model used for documents — no separate CLIP or multimodal vector space is required.

#### Disabling or Switching Providers

Media embedding is **always on** — there is no master on/off switch. To turn a class off, set its **level** to `off` per class (images / audio / video) on **Settings → Media Processing**, or via `PATCH /api/admin/media-config` with a `levels` block (e.g. `{ "levels": { "images": "off", "audio": "off", "video": "off" } }` turns all media off instance-wide). *(Breaking change: the old `MEDIA_EMBEDDING_ENABLED` env var and `mediaEmbedding.enabled` config flag were removed; an existing `enabled:false` is auto-migrated to those three levels = `off` on upgrade.)*

Required services (bundled by default; override only when you point at external providers):

- **Ollama** (image captioning): `OLLAMA_URL=http://ollama:11434` — deploy any vision-capable model (default: `moondream`).
- **faster-whisper-server** (audio/video STT): `WHISPER_URL=http://whisper:8000` — set model via `WHISPER_MODEL` (default: `base`).

Kubernetes manifests are provided in `kubernetes/manifests/ollama-deploy.yaml` and `kubernetes/manifests/whisper-deploy.yaml`. Dual `NetworkPolicy` + `CiliumNetworkPolicy` resources are in `media-netpol.yaml` and `media-cilium-netpol.yaml`.

When you point vision/STT at an **external** provider, its endpoint URL is validated against SSRF on save (must be a public http(s) URL) **and** reached only through the SSRF-guarded fetch at runtime (DNS-resolve + IP-pin + redirect re-validation) — so a DNS-rebind or redirect can't turn it into a request to an internal address. The bundled local Ollama/Whisper providers use a direct fetch (their addresses are private by design).

#### Upload Response

When a media file is uploaded, the response includes an `embeddingStatus` field:

| Value | Meaning |
|---|---|
| `"pending"` | Job enqueued; background worker will process soon |
| `"skipped"` | Not analysed — the file exceeds `MAX_FILE_SIZE_BYTES`, **or** this media class is `off` for the space (its `levels` entry). File stored, not embedded |
| `"disabled"` | **Legacy** — set at upload while the removed media-embedding master switch was off. No longer produced (a class turned off now returns `"skipped"`); still appears on pre-migration records |

While processing, the filemeta record on the file (accessible via `GET /api/brain/spaces/:spaceId/files`) reflects the current status:

| Status | Meaning |
|---|---|
| `"pending"` | Waiting in queue |
| `"processing"` | Currently being processed by the worker |
| `"complete"` | Embedding finished successfully |
| `"failed"` | All retry attempts exhausted; see `mediaJobError` field for details |

#### Recall Results

Recall queries (`recall`, `find_similar`) include embedded media chunks. Each media chunk result has additional fields:

```json
{
  "type": "file",
  "mediaType": "audio",
  "embeddingStatus": "complete",
  "chunkOffsetMs": 12000,
  "chunkDurationMs": 8000,
  "parentFile": {
    "path": "recordings/meeting-2025-01.mp3",
    "description": "Q1 strategy meeting"
  }
}
```

`chunkOffsetMs` and `chunkDurationMs` identify the segment within the original audio or video file. Image results have `chunkIndex: 0` with no time offset.

#### Retry Failed Embedding

To re-queue a failed job:

```http
POST /api/files/:spaceId/retry_embedding?path=uploads/photo.jpg
Authorization: Bearer ythril_…
```

**Response** `202` — job re-queued.

**Response** `404` — file does not exist or has no embedding job.

**Response** `409` — job is currently processing; retry is blocked until it completes.

#### Configuration

All settings can be managed at `GET/PATCH /api/admin/media-config` or via **Settings → Media Processing** in the web UI. Fields set via environment variables are locked (the UI shows an `env` badge; PATCH returns `403` for those fields).

**Changes take effect without a restart.** Provider settings — `visionProvider`/`sttProvider`, the `vision.*`/`stt.*` endpoint, model, and API key, and `fallbackToExternal` — are applied by a dedicated refresh timer that re-reads the config every ~2 s, independent of the job loop. A provider or model switch is therefore picked up within a couple of seconds **even when the queue is empty or a job is stuck on a slow/unreachable provider** — which matters because you often change providers precisely because one is hanging. A job already in flight keeps the provider it started with, so a swap can never happen mid-job.

The worker-tuning fields — `workerConcurrency`, `workerPollIntervalMs`, `workerMaxPollIntervalMs`, `stalledJobTimeoutMs` — are re-read on the worker's poll tick instead. When the queue is idle the worker backs off its poll interval (up to `workerMaxPollIntervalMs`, default 30 s), so a change to one of these can take up to that long to be picked up while idle.

`GET /api/admin/media-config` returns a `providerReloadPending` boolean: `true` briefly after a provider change is saved and before the refresh timer has applied it, then `false`. Use it to show an "applying…" state in a UI.

| Field | Env var | Default | Description |
|---|---|---|---|
| `levels.{images,audio,video,text}` | — | `auto` | Per-class instance ceiling; set a class to `off` to take it offline. **This is the media on/off control** (the `enabled` / `MEDIA_EMBEDDING_ENABLED` master switch was removed). |
| `visionProvider` | `VISION_PROVIDER` | `local` | Wire protocol, not trust level: `local` (Ollama `/api/chat`) or `external` (OpenAI `/chat/completions`). A self-hosted OpenAI-compatible server needs `external` — see `allowPrivateModelEndpoints` for one on a private address. |
| `sttProvider` | `STT_PROVIDER` | `local` | Wire protocol, not trust level: `local` (bundled Whisper) or `external` (OpenAI-compatible). Both speak `/v1/audio/transcriptions`. |
| `vision.baseUrl` | `VISION_BASE_URL` | `http://ollama:11434` | Vision service endpoint, **whatever the provider** (short name resolves in both Docker Compose and the K8s `ythril` namespace). On an OpenAI-compatible provider, `…:8080` and `…:8080/v1` both work. Legacy alias: `OLLAMA_URL`. |
| `vision.model` | `VISION_MODEL` | `moondream` | Vision model name |
| `vision.apiKey` | `VISION_API_KEY` | — | API key for external vision provider (stored in `secrets.json`, never in `config.json`) |
| `stt.baseUrl` | `STT_BASE_URL` | `http://whisper:8000` | STT service endpoint, **whatever the backend**. `…:8000` and `…:8000/v1` both work — the transcription URL is normalised the same way the vision and assist endpoints are, so one base URL serves all three. Legacy alias: `WHISPER_URL`. |
| `stt.model` | `STT_MODEL` | `base` | STT model name — passed through to the backend, so it is not restricted to Whisper size names. Legacy alias: `WHISPER_MODEL`. |
| `stt.apiKey` | `STT_API_KEY` | — | API key for external STT provider (stored in `secrets.json`) |

> **Renamed in 2.1: `OLLAMA_URL` → `VISION_BASE_URL`, `WHISPER_URL` → `STT_BASE_URL`, `WHISPER_MODEL` → `STT_MODEL`.**
>
> The old names described the implementation that happened to be first, not the field they configure.
> `OLLAMA_URL` is the sharpest case: it sets `vision.baseUrl`, which is used **even when
> `visionProvider` is `external`** — so an operator running vLLM or llama.cpp had to set a variable named
> after a product they were not running, assuming they found it at all. This is the same distinction the
> provider switch already gets right: **the setting names a wire protocol, not a product.**
>
> **The old names keep working.** They are not deprecated-then-removed on a timer — breaking a documented
> env var to improve its spelling is not a worthwhile trade, and an upgrade should never become an outage.
> Each one logs a single `warn` at startup naming its replacement. If both spellings are set, the new one
> wins **and the log says so** — a silently-ignored value that is visibly present in your own manifest is
> among the most expensive things to debug.
>
> `lockedByInfra` tracks whichever spelling you used, so the Settings UI renders the field read-only
> either way.
| `embedding.provider` | `EMBEDDING_PROVIDER` | `local` | Text-embedding endpoint trust: `local` (bundled ONNX or an internal HTTP endpoint, plain fetch) or `external` (public endpoint, reached through the SSRF-guarded fetch). Config lives at top-level `config.embedding` but is edited on **Settings → Media Processing**. |
| `embedding.baseUrl` | `EMBEDDING_URL` | — | Embedding HTTP endpoint (OpenAI-compatible `/v1/embeddings`). `…:8080` and `…:8080/v1` both work. Blank = the bundled in-process ONNX model. |
| `embedding.model` | `EMBEDDING_MODEL` | `nomic-ai/nomic-embed-text-v1.5` | Embedding model. **Changing the model / `dimensions` / `similarity` / `prefixScheme` re-indexes every vector** (the UI requires an explicit confirmation; `POST /api/brain/spaces/:id/reindex` runs it). |
| `embedding.prefixScheme` | `EMBEDDING_PREFIX_SCHEME` | `auto` | Task-prefix convention the model expects: `nomic` (`search_document:` / `search_query:` prefixes, trailing space included), `qwen` (instruction on the query only, passages bare), `none` (symmetric models — OpenAI `text-embedding-3-*`, bge-m3), or `auto`. **`auto` reproduces the behaviour this instance had before the field existed: `nomic` for the bundled model, `none` over HTTP — so upgrading changes no vector.** If you run nomic or Qwen behind an endpoint, set this explicitly and reindex — asymmetric models retrieve measurably worse without the prefix, and nothing errors when it is missing. |
| `embedding.dimensions` | `EMBEDDING_DIMENSIONS` | `768` | Vector width the model emits. Must match the model — a mismatch is not detected at write time, it surfaces as recall that returns nothing. Listed with `model` above as a re-index trigger. |
| `embedding.apiKey` | `EMBEDDING_API_KEY` | — | API key for an external embedding endpoint (stored in `secrets.json`, masked in the API). |
| `mediaEmbedding.nli.baseUrl` | `NLI_URL` | — | Contradiction-judge endpoint. **Blank = contradiction detection has no judge** and the Contradictions view is empty by design, not by failure. Same locality rule as the reranker: a loopback or dot-less host is a sidecar and gets a plain fetch; anything else goes through the SSRF-guarded fetch. It sees **pairs of stored record texts**, so it is an egress path of the same weight as vision or STT. |
| `mediaEmbedding.nli.model` | `NLI_MODEL` | — | NLI model name, e.g. an mDeBERTa or DeBERTa cross-encoder. Required alongside `baseUrl`. |
| `mediaEmbedding.nli.apiKey` | `NLI_API_KEY` | — | API key for the contradiction judge (stored in `secrets.json`, masked in the API). |
| `mediaEmbedding.rerank.baseUrl` | `RERANK_URL` | — | Reranker endpoint. **Blank = reranking is off** (there is no separate toggle). A URL ending in `/rerank` is read as the text-embeddings-inference request shape; anything else gets `/v1/rerank` appended and the Cohere/Jina shape. A loopback or dot-less host is treated as a sidecar and reached with a plain fetch; anything else goes through the SSRF-guarded fetch. |
| `mediaEmbedding.rerank.model` | `RERANK_MODEL` | — | Cross-encoder model, e.g. `BAAI/bge-reranker-v2-m3`. Required alongside `baseUrl` — reranking is on only when both are set. |
| `mediaEmbedding.rerank.candidateMultiplier` | `RERANK_CANDIDATE_MULTIPLIER` | `4` | Candidates fetched per requested result before reranking (2–10, and capped at 100 candidates absolutely). A reranker can only re-order what the vector search already found, so this over-fetch is the whole mechanism; at 1 it would reorder exactly the results you would have got anyway. |
| `mediaEmbedding.rerank.apiKey` | `RERANK_API_KEY` | — | API key for the reranker (stored in `secrets.json`, masked in the API). |
| *(no config key)* | `YTHRIL_HYBRID_SEARCH` | on | Set to `off` to disable **hybrid retrieval** — the lexical (BM25-family `$text`) channel that is fused into semantic recall by Reciprocal Rank Fusion. Env-only on purpose: it is a rollback lever for isolating a retrieval regression, not an operator preference. On by default; a space whose collections have no `lexical_text` index simply contributes an empty lexical channel and recall stays vector-only. **This does not replace the list filters** — `?search=` and the column filters decide which records are *eligible*; hybrid decides how eligible records *rank*. |
| `workerConcurrency` | `WORKER_CONCURRENCY` | `2` | Max parallel jobs |
| `workerPollIntervalMs` | `WORKER_POLL_INTERVAL_MS` | `1000` | Base poll interval (ms) |
| `workerMaxPollIntervalMs` | `WORKER_MAX_POLL_INTERVAL_MS` | `30000` | Max poll interval when idle (ms) |
| `fallbackToExternal` | `MEDIA_EMBEDDING_FALLBACK_TO_EXTERNAL` | `false` | Use external provider if local fails |
| `maxFileSizeBytes` | `MAX_FILE_SIZE_BYTES` | `524288000` | Skip embedding for files above this size (500 MiB) |
| `stalledJobTimeoutMs` | `STALLED_JOB_TIMEOUT_MS` | `300000` | Re-queue jobs stuck in processing for > N ms |

#### ISO 27001 / Data Egress Note

When `visionProvider: external` or `sttProvider: external`, file bytes (image frames, audio segments) are transmitted to the configured external endpoint. Ensure the endpoint URL complies with your data residency and privacy requirements. Using `visionProvider: local` and `sttProvider: local` with on-premises Ollama and Whisper keeps all data within your infrastructure.

---

### Face Recognition Pipeline

The face recognition pipeline detects and embeds faces in uploaded images, builds a per-space face gallery, and automatically links images to person entities when a match exceeds a configurable confidence threshold. It runs **entirely in-process** on the CPU — no GPU, no sidecar, no Python — using `@vladmandic/human` (TF.js CPU backend).

**Faces are governed by the image LEVEL, not by a switch of their own.** They run only where the effective
image level is `recognition` (or `auto`, which resolves to the most the instance allows). The instance
default is `caption`, so **no face detection happens until someone raises a level** — on
**Settings → Media Processing** for the instance ceiling, or per space in that space's media settings.

There is no longer a face-recognition checkbox: it was redundant with the ladder, and having two controls
meant an image level of `recognition` could still silently do nothing. `mediaEmbedding.faceRecognition.enabled`
survives as an **infra pin only** — it defaults to `true` and exists so `FACE_RECOGNITION_ENABLED=false`
can hard-disable the pipeline regardless of any level, for deployments where biometric processing must be
impossible rather than merely off. Setting it to `true` does not enable anything by itself.

**Turning it off stops new detection; it does not erase what was collected.** Existing face vectors and person labels stay stored and searchable until the files they came from are deleted. The admin UI states this in a confirmation before saving, because switching this off is usually a privacy decision and the two are easy to confuse.

#### Prerequisites: Model Files

The model files are not bundled with Ythril. Download and place them in `DATA_ROOT/<modelPath>/` (default: `human-models/`):

| File | Size | Purpose |
|---|---|---|
| `blazeface-back.json` + `.bin` | ~0.5 MB | Face detector (BlazeFace Back) |
| `faceres.json` + `.bin` | ~6.7 MB | 128-dimensional face descriptor (FaceRes) |

Download from `https://vladmandic.github.io/human/models/` — use the exact filenames listed above.

Also create the Atlas vector index for face embeddings (per space, 128 dimensions, cosine similarity, field path `faceEmbedding`, index name `{spaceId}_files_faceEmbedding`) on the `{spaceId}_files` collection. This is done automatically when a space is initialised.

#### How It Works

When a media-embedding job processes an image whose effective level permits faces (`recognition` or `auto`,
and the infra pin not turned off):

1. **Decode** — image bytes decoded to raw RGBA via `sharp`.
2. **Detect** — `@vladmandic/human` runs BlazeFace Back detection. Faces below `minFaceSizeFraction` (default: 5% of the shorter image side) are skipped.
3. **Embed** — FaceRes produces a 128-dimensional descriptor per face.
4. **Gallery search** — each descriptor is searched against the space's face gallery (all face-chunk records that have a `faceEntityId`) using an exact `$vectorSearch`. The top-1 result is examined.
5. **Auto-label** — if the top match's cosine similarity score ≥ `confidenceThreshold` (default: `0.6`), the parent image is linked to that entity (`entityIds` updated). The first successful match wins.
6. **Persist face-chunks** — one `{fileId}#face-chunk{N}` filemeta record per detected face is written (or replaced on reprocess) with:
   - `faceEmbedding` — the 128d descriptor
   - `faceBbox` — normalised `[x, y, w, h]` bounding box
   - `faceEntityId` — populated if auto-labeled or manually labeled
   - `faceScore` — cosine similarity of the gallery match (when auto-labeled)
   - `parentFileId` — the original image's filemeta `_id`

#### Gallery Poisoning Guard

Only entities whose `type` is listed in `personEntityTypes` (default `["person"]`) are eligible for the face gallery. When a user manually links an image to an entity via `updateFileMeta`:

- If exactly one `personEntityTypes` entity is in `entityIds`, all face-chunks of that file are immediately updated with `faceEntityId` — the labeled face enters the gallery at once.
- If zero or more than one person-type entity is present, no gallery entry is made. This prevents a "group photo" from poisoning the gallery with an ambiguous identity.

#### Manual Label Propagation

When a user manually updates `entityIds` on an image (e.g. correcting a mis-label via the Files UI or REST API), Ythril calls `propagateFaceLabel` — which sets `faceEntityId` on every face-chunk record belonging to that file. This immediately improves future auto-labeling for that person's identity.

#### Synced Image Reprocessing

When `reprocessSyncedImages: true` (default), images received through a network sync are automatically enqueued for face processing if they have not yet been processed (`faceChunkCount` is `0`). This lets secondary instances build a full face gallery from synced images without requiring separate re-uploads.

Set `reprocessSyncedImages: false` to restrict gallery building to images uploaded directly to each instance.

#### MongoDB Atlas Vector Index

Face recognition requires a dedicated Atlas vector search index per space. Name: `{spaceId}_files_faceEmbedding`, field: `faceEmbedding`, dimensions: `128`, similarity: `cosine`. This is distinct from the text embedding index used by `recall`.

When the face recognition feature is first enabled, any existing `initSpace` call will create the required index. If you add the feature after spaces already exist, re-run `initSpace` for each space or create the index manually via the Atlas UI / MongoDB admin API.

#### Configuration Reference

All settings live under `mediaEmbedding.faceRecognition` in `config.json`. `enabled`, `confidenceThreshold`, `minFaceSizeFraction` and `personEntityTypes` are also settable through `PATCH /api/admin/media-config` (merged per field, so a patch naming one leaves the rest alone).

**`modelPath` and `reprocessSyncedImages` are deliberately NOT on that route** and stay config/env-only. `modelPath` selects which files the process loads from disk, and a field that chooses what gets loaded has no business being settable from the admin API — the same reasoning that keeps `allowPrivateModelEndpoints` and the document model endpoints off it. `reprocessSyncedImages` decides whether a network peer’s images are re-analysed locally, which is an infra-shaped call.

Each field can also be **pinned by an infra admin** through the env var below, with the same precedence as every other media setting: **env → `config.json` → default**. A pinned field is reported in `lockedByInfra` on `GET /api/admin/media-config`, so the Settings UI renders it read-only rather than offering a control that silently does nothing. This is why the env vars exist at all: every other model in the pipeline (vision, speech-to-text, embedding, the assist model, both sidecars) could already be pinned, so an infra-managed deployment could fix every model *except* whether faces are detected and embedded — the setting with the clearest privacy weight of the lot.

| Field | Env var | Default | Description |
|---|---|---|---|
| `enabled` | `FACE_RECOGNITION_ENABLED` | `false` | Master switch. When false, face detection is completely skipped. |
| `confidenceThreshold` | `FACE_RECOGNITION_CONFIDENCE_THRESHOLD` | `0.6` | Cosine similarity score (0–1) required for auto-labeling. Lower values label more aggressively; higher values require a closer match. Tune upward as your gallery grows. |
| `minFaceSizeFraction` | `FACE_RECOGNITION_MIN_FACE_SIZE_FRACTION` | `0.05` | Minimum face bounding-box size as a fraction of the image's shorter side. Faces smaller than this are skipped (avoids noise from crowd shots or background faces). |
| `modelPath` | `FACE_RECOGNITION_MODEL_PATH` | `"human-models"` | Path relative to `DATA_ROOT` where the BlazeFace and FaceRes model files are located. |
| `personEntityTypes` | `FACE_RECOGNITION_PERSON_ENTITY_TYPES` | `["person"]` | Entity type names that qualify as people. Only entities with a `type` in this list are eligible to enter the face gallery. Extend this list if you use custom type names like `"contact"` or `"employee"`. **Comma-separated** as an env var: `FACE_RECOGNITION_PERSON_ENTITY_TYPES=person,employee`. |
| `reprocessSyncedImages` | `FACE_RECOGNITION_REPROCESS_SYNCED_IMAGES` | `true` | When true, images received via network sync are automatically re-enqueued for face processing if they haven't been processed yet. Set to false to keep gallery building local-origin only. |

> Booleans accept `true` or `1`; anything else reads as false. Pinning `FACE_RECOGNITION_ENABLED=false` is the way to guarantee no face processing happens on an instance regardless of what is in `config.json` — including after a restore from a backup taken on an instance where it was on.

**Example `config.json` excerpt:**

```json
{
  "mediaEmbedding": {
    "enabled": true,
    "faceRecognition": {
      "enabled": true,
      "confidenceThreshold": 0.65,
      "minFaceSizeFraction": 0.05,
      "modelPath": "human-models",
      "personEntityTypes": ["person", "contact"],
      "reprocessSyncedImages": true
    }
  }
}
```

#### ISO 27001 Note

Face embeddings (128d float vectors) are stored in MongoDB. They are not reversible to images; they cannot reconstruct a face. No face data is transmitted to any external service — all inference is in-process. If your data residency policy classifies biometric-derived data, ensure your MongoDB instance and backup destinations comply.

---
