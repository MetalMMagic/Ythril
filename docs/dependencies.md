# Dependencies and Licensing Notes

This document explains how Ythril uses its runtime dependencies, the licensing
status of each, and why Ythril's PolyForm Small Business License obligations are not affected by them.

---

## Node.js packages

Ythril is an npm-workspaces monorepo: the **root** `package.json` declares no runtime
dependencies of its own — they live in [`server/package.json`](../server/package.json)
and [`client/package.json`](../client/package.json). The attribution-requiring packages
across both workspaces are reproduced in [NOTICE](../NOTICE). They are MIT, Apache 2.0,
0BSD, BSD-3-Clause, or ISC licensed. No copyleft restrictions apply.

---

## mongodb/mongodb-atlas-local (Docker image)

### What it is and why it is used

Ythril's `docker-compose.yml` references the official `mongodb/mongodb-atlas-local`
image published by MongoDB, Inc. on Docker Hub. It is used as the database backend.

The image bundles two processes:

| Process | Role | License |
|---------|------|---------|
| `mongod` | MongoDB Community Edition server | Server Side Public License v1 (SSPL) |
| `mongot` | Search and vector-index sidecar | Proprietary (MongoDB, Inc.) |

`mongot` is the reason this specific image is used instead of plain Community Edition.
Ythril issues `$vectorSearch` aggregation queries against MongoDB to power semantic
recall (`query` and `recall` MCP tools; calling `recall` with its `space` parameter
omitted searches across every space the token can access). That stage requires `mongot`
to be running and connected to `mongod`. There is currently no fully open-source
drop-in replacement that provides equivalent vector search on top of MongoDB.

### How it is deployed

The image runs as a **separate container** (`ythril-mongo`) on a private, **internal** Docker
bridge network (`ythril-db`). Ythril connects to it over TCP at `mongodb://ythril-mongo:27017`.

> **Security — the database network is deliberately isolated.** MongoDB runs without
> authentication, so Ythril's security model (PATs, admin gating, space scoping, read-only
> tokens, the audit log) is enforced at the **API layer only** — anything that can open a TCP
> connection to port 27017 can read and rewrite every space, invisibly to the audit log.
>
> The media sidecars (`ollama`, `whisper`) exist to parse **untrusted user-supplied media**
> and are the highest-risk attack surface in the deployment, so they live on a *separate*
> network (`ythril-media`) and **cannot reach the database at all**. Only the `ythril`
> container bridges the two. `ythril-db` is marked `internal: true`, so the database also has
> no outbound internet access. This mirrors what the Kubernetes deployment enforces via
> `NetworkPolicy` (`kubernetes/manifests/media-netpol.yaml`).
>
> If you add a service that needs the database, put it on `ythril-db` deliberately — and
> understand that you are granting it unauthenticated access to the entire brain.

### Authenticating the bundled database

**New installs: just set credentials.** Copy `.env.example` to `.env` and set:

```bash
MONGO_USERNAME=ythril
MONGO_PASSWORD=$(openssl rand -base64 24)
```

Compose passes them to the database as the root user and to Ythril, which builds an
authenticated connection URI. Nothing else is required.

**Existing installs: leave them empty, and migrate deliberately.**

MongoDB **cannot have authentication switched on in place**. The Atlas Local image runs a
single-node replica set (required for `$vectorSearch`), and auth on a replica set needs an
internal keyfile that the image only provisions on a **first** init. Adding credentials to a
database that already holds data does **not** enable auth — mongod fails to start with
`Unable to acquire security key[s]`, and hand-placing a keyfile breaks the replica set
(`node is not in primary or recovering state`).

So migrating means recreating the database and restoring into it. **Back up first.**

```bash
# 1. Dump the application database ONLY. Never dump/restore `admin` — it holds the auth
#    users, and restoring it over a fresh instance clobbers the account you just created.
docker exec ythril-mongo mongodump --db=ythril --out=/tmp/dump
docker cp ythril-mongo:/tmp/dump ./mongo-dump

# 2. Also copy the data directory itself, so the old state is recoverable.
cp -r local-data/mongo local-data/mongo.backup

# 3. Set MONGO_USERNAME / MONGO_PASSWORD in .env, then recreate the database from empty
#    (this is the only path on which the image can enable auth).
docker compose down
docker volume rm ythril_ythril-mongo-data ythril_ythril-mongo-configdb   # or clear the bind mount
docker compose up -d ythril-mongo

# 4. Restore, authenticating with the new credentials.
docker cp ./mongo-dump ythril-mongo:/tmp/dump
docker exec ythril-mongo mongorestore \
  -u "$MONGO_USERNAME" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  --db=ythril /tmp/dump/ythril

# 5. Start Ythril. It rebuilds the $vectorSearch indexes on boot.
docker compose up -d
```

Verify before deleting the backup: the entry counts in **Settings → Spaces** should match
what you had, and semantic recall should return results once the vector indexes finish
building.

**Already using managed Atlas or your own cluster?** Nothing to do — set `MONGO_URI` and it
wins over everything above; those deployments are already authenticated.

```text
[ythril container] --TCP:27017--> [ythril-mongo container]
                                   ├── mongod (SSPL)
                                   └── mongot (proprietary)
```

The `ythril-mongo` container has **no published ports** — it is not reachable from
the host or any external network. Only the `ythril` container can reach it, via
the internal bridge.

### Ythril does not distribute this image

Ythril's repository contains no MongoDB binaries, no `mongot` binary, and no
MongoDB source code. The `docker-compose.yml` file contains only a reference to
the image name on Docker Hub. Docker pulls the image separately when a user runs
`docker compose up`. Ythril is not the distributor.

### PolyForm compliance

**No conflict.** Here is why:

1. **No combined work.** Ythril communicates with `mongod`/`mongot` solely over a
   TCP socket. GPL-family copyleft extends to works that are statically linked or
   form a combined work in the same process. A database server accessed over a
   network socket is not a combined work with the client. This is the same legal
   relationship as any application using PostgreSQL, Redis, or any other
   server-based database.

2. **SSPL "Service Provision" clause does not apply.** SSPL's aggressive clause
   requires that if you make the covered software itself available as a service
   (i.e., you are offering MongoDB-as-a-service), you must open-source your entire
   service infrastructure. Ythril uses MongoDB as an internal component of a
   different application. It does not offer MongoDB as a service to anyone.

3. **mongot is external and not incorporated.** `mongot` is proprietary, but it
   runs as a separate process inside a separate container that Ythril never ships.
   No proprietary binary is incorporated into Ythril's source or distribution.

**Summary:** Ythril's PolyForm source obligations apply only to Ythril's own code.
They do not extend to `mongod`, `mongot`, or the `mongodb/mongodb-atlas-local` image.

### Honest disclosure

The semantic recall feature has a runtime dependency on a proprietary binary
(`mongot`). A deployment of Ythril with full functionality is therefore not a
fully open-source stack. This is an accepted constraint, documented here and in
[NOTICE](../NOTICE). It does not affect compliance, but it is worth knowing if
you are evaluating Ythril for an environment where fully open-source runtime
stacks are required.

A future Ythril version may introduce an alternative vector-search backend
(e.g., plain MongoDB CE + mongot CE Preview, or a different vector store) to
address this for users who need it.

---

## MongoDB 8.2+ (Community / Enterprise)

MongoDB 8.2+ ships native `$vectorSearch` support without requiring the `mongot`
sidecar. Ythril detects this at startup and uses it automatically.

| MongoDB flavour | `$vectorSearch` | License | `mongot` needed |
|---|---|---|---|
| `mongodb/mongodb-atlas-local` (default) | ✓ | SSPL + proprietary (`mongot`) | Bundled |
| Managed MongoDB Atlas (M10+) | ✓ | Managed service (ToS) | Managed |
| MongoDB 8.2+ Community Edition | ✓ | SSPL | No |
| MongoDB 8.2+ Enterprise | ✓ | Commercial | No |
| MongoDB < 8.2 (vanilla) | ✗ | SSPL | N/A |

When using MongoDB 8.2+ CE, the SSPL analysis above still applies — Ythril uses
MongoDB as an internal component over a TCP socket, not as a service offering.
The key difference is that **no proprietary `mongot` binary is involved**, making
this the only fully SSPL-only (no proprietary) deployment option with full
`$vectorSearch` support.

See [integration-guide.md](integration-guide.md#mongodb-flexibility) for
connection configuration.

---

## Media & document runtime images (Docker / Kubernetes sidecars)

Ythril's media-embedding and document-conversion pipelines run as **separate
container images**, pulled independently at deployment time exactly like the
MongoDB image above. None of them are bundled into or distributed by Ythril, and
none are linked into the application — Ythril talks to each over HTTP on a private
network. They are documented here per the [contribution guide's](contribution-guide.md)
Legal principle that runtime infrastructure must be listed with its licensing impact.

| Image | Role | License |
|---|---|---|
| `ollama/ollama` | Vision model host — captions uploaded images (default `moondream`) for the media pipeline. | MIT (the Ollama runtime). Models are pulled separately; the default `moondream` is Apache 2.0. |
| `fedirz/faster-whisper-server` | Speech-to-text — transcribes uploaded/segmented audio via an OpenAI-compatible endpoint. | MIT (the server). Whisper models are pulled separately and are Apache 2.0. |
| `unstructured-io/unstructured-api` | Server-side PDF / DOCX / EPUB conversion (`hi_res` OCR + layout detection, table and embedded-image extraction). | Apache 2.0. |
| `ythril-doc-render` (first-party, built from `sidecars/doc-render`) | Renders PDF pages to PNG images for the F11 VLM document-extraction path (`documentProcessing.mode` `vlm`/`auto`/`max`). | Apache-2.0. Wraps **PDFium** via `pypdfium2` (Apache-2.0 / BSD-3-Clause) + Pillow (HPND) — all permissive. Deliberately **not** PyMuPDF (AGPL-3.0). See [`sidecars/doc-render/LICENSES.md`](../sidecars/doc-render/LICENSES.md). |

**Where they are referenced.** `ollama`, `whisper`, `unstructured`, and `doc-render` are all services in
[`docker-compose.yml`](../docker-compose.yml). `ollama`/`whisper` also have matching Kubernetes manifests
(`kubernetes/manifests/{ollama,whisper}-deploy.yaml`); the `unstructured-api` sidecar is
in `kubernetes/manifests/ythril-deployment.yaml`, pod-local. `ollama`/`whisper` form the
media-embedding stack; `unstructured` is the bundled document-conversion sidecar, and `doc-render`
is the first-party page-render sidecar built locally from `sidecars/doc-render` (not pulled).

> **Why not `unstructured-api-full`?** The `-full` variant (extra Tesseract language packs +
> LibreOffice) was made private on quay.io and now returns `401 UNAUTHORIZED` on an anonymous
> pull. The public `unstructured-api` image is built from the same release, supports the exact
> `hi_res` OCR + embedded-image extraction path Ythril calls, and is what upstream's own README
> points self-hosters at. Ythril's PDF/DOCX/EPUB + English-OCR path needs nothing the `-full`
> extras add.
>
> **Image size — `unstructured-api` is heavy (~4.5 GB compressed).** It bundles OCR model
> weights (Tesseract), so the first `docker compose up` pulls a large image and the sidecar
> is slow to become ready (a long `start_period`). It is intentionally **not** a startup
> dependency of the `ythril` service — Ythril runs without it and PDF/DOCX/EPUB conversion
> simply reports `sidecar_down` until the sidecar is up. On a resource-constrained workstation,
> skip it with `docker compose stop unstructured` (or `--scale unstructured=0`); in-process
> text/HTML conversion and every other feature keep working. It runs on an isolated, internal
> `ythril-convert` network with no database access and no internet egress.

**Licensing impact — none on Ythril's PolyForm obligations.** All three are permissively
licensed (MIT / Apache 2.0), carry no copyleft, and run as independent network services
rather than linked code — the same TCP-socket relationship analysed for MongoDB above.
`unstructured-api` in particular ships under Apache 2.0, but because its tag can change,
verify the image's bundled `LICENSE` on every version bump (the procedure is documented in
the header of `kubernetes/manifests/ythril-deployment.yaml`).
