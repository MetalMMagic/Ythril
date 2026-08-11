# Face Recognition Pipeline

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Face Recognition Pipeline

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
| `faceres.json` + `.bin` | ~6.7 MB | Face descriptor (FaceRes). The model outputs 1024 dimensions; `@vladmandic/human` reduces them to the 128 the gallery stores |

Download from `https://vladmandic.github.io/human/models/` — use the exact filenames listed above.

Also create the Atlas vector index for face embeddings (per space, 128 dimensions, cosine similarity, field path `faceEmbedding`, index name `{spaceId}_files_faceEmbedding`) on the `{spaceId}_files` collection. This is done automatically when a space is initialised.

#### How It Works

When a media-embedding job processes an image whose effective level permits faces (`recognition` or `auto`,
and the infra pin not turned off):

1. **Decode** — image bytes decoded to raw RGBA via `sharp`.
2. **Detect** — `@vladmandic/human` runs BlazeFace Back detection. Faces below `minFaceSizeFraction` (default: 5% of the shorter image side) are skipped.
3. **Embed** — FaceRes produces a descriptor per face, which the library reduces to 128 dimensions. That reduction, not the model weights, is where the 128 comes from — worth knowing because the gallery is built on it.
   - **The width is read from the space's own face index**, not from an instance-wide constant, so a space
     is judged against the vectors it actually holds. Every space is still created at 128 today; what
     changed is that nothing downstream assumes it. A gallery built at one width keeps rejecting another
     even if the default changes later — its stored vectors have not moved.
   - **A descriptor of any other width is skipped, and the first one is logged as a warning** naming the width received and which path produced it (in-process or external). One odd descriptor must not fail a whole media job, so the skip itself is not an error; the log is once per process, because a changed width means every face is affected and a per-face log would bury the message. If face recognition appears to find nothing, check for this warning before concluding the images have no faces — that is the symptom a width mismatch produces.
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

**This index is never re-dimensioned automatically, and that is deliberate.** Ythril rebuilds other vector indexes when their definition changes, because re-embedding the records makes the vectors catch up. Face vectors live on already-stored face-chunk records and nothing re-derives them, so a rebuild at a new width would leave the stored vectors indexed as if they were the new width — every similarity score wrong, with no error reported. If the configured width ever differs from an existing space's index, Ythril **refuses the change, keeps the existing width, and logs both numbers**. To move a populated gallery, re-embed its faces at the new width first. A filter-field change still applies, at the existing width.

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
