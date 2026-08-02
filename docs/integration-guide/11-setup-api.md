# Setup API

> Part of the [Ythril Integration Guide](../integration-guide.md).

## Setup API

### Health Check (unauthenticated)

```http
GET /health
```

**Response** `200`:

```json
{ "status": "ok", "ts": "2026-03-25T14:00:00.000Z" }
```

---

### Readiness Check (unauthenticated)

```http
GET /ready
```

Returns process readiness based on dependency checks (MongoDB + vector search availability).

**Response** `200` when ready, `503` when not ready.

Example:

```json
{
  "ready": true,
  "checks": {
    "mongodb": { "status": "ok" },
    "vectorSearch": { "status": "ok" }
  }
}
```

---

### Prometheus Metrics

```http
GET /metrics
```

Exposes a [Prometheus-compatible](https://prometheus.io/docs/instrumenting/exposition_formats/) metrics endpoint for production monitoring.

**Authentication**: Set the `METRICS_TOKEN` environment variable (recommended) — Prometheus scrapers must send `Authorization: Bearer <METRICS_TOKEN>` in their scrape config. If `METRICS_TOKEN` is unset the endpoint falls back to requiring a valid admin PAT. Returns `401` without valid credentials.

**Response** `200` — `text/plain; version=0.0.4; charset=utf-8`:

```text
# HELP ythril_http_requests_total Total HTTP requests by method, route pattern, and status code
# TYPE ythril_http_requests_total counter
ythril_http_requests_total{method="GET",route="/health",status_code="200"} 42
...
```

**Metrics exposed:**

| Metric | Type | Description |
|---|---|---|
| `ythril_http_requests_total` | counter | Total requests by method, route, status code |
| `ythril_http_request_duration_seconds` | histogram | Request latency by method and route |
| `ythril_http_request_size_bytes` | histogram | Request body size |
| `ythril_http_response_size_bytes` | histogram | Response body size |
| `ythril_memories_total` | gauge | Approximate memories by space — read from collection metadata, not counted per scrape |
| `ythril_entities_total` | gauge | Approximate entities by space (same estimate as above) |
| `ythril_edges_total` | gauge | Approximate edges by space (same estimate as above) |
| `ythril_chrono_entries_total` | gauge | Approximate chrono entries by space (same estimate as above) |
| `ythril_spaces_total` | gauge | Number of configured spaces |
| `ythril_embedding_duration_seconds` | histogram | Time to compute a single embedding |
| `ythril_embedding_queue_depth` | gauge | Pending embedding operations |
| `ythril_reindex_in_progress` | gauge | 1 if a reindex is running, 0 otherwise |
| `ythril_storage_used_bytes` | gauge | Storage used in bytes by area (brain, files, total) |
| `ythril_storage_limit_bytes` | gauge | Configured storage limits by area and tier (soft, hard) |
| `ythril_auth_attempts_total` | counter | Auth attempts by result (success, invalid) |
| `ythril_tokens_active` | gauge | Number of active (non-expired) tokens |
| `ythril_mcp_connections_active` | gauge | Current SSE connections |
| `ythril_mcp_tool_calls_total` | counter | Tool invocations by tool name and space |
| `ythril_sync_cycles_total` | counter | Sync cycles by network and status |
| `ythril_sync_items_pulled_total` | counter | Items received by type |
| `ythril_sync_items_pushed_total` | counter | Items sent by type |
| `ythril_sync_duration_seconds` | histogram | Time per sync cycle |
| `ythril_recall_degraded_total` | counter | Recalls answered with a **weaker pipeline than configured**, by `reason`. `rerank_unavailable` = the cross-encoder is configured but did not answer; `rerank_skipped_budget` = it was not attempted because the end-to-end `RECALL_BUDGET_MS` was already spent upstream. **This is the one to alert on**: these paths return HTTP 200 with a worse ranking, so they raise no error rate and barely move latency — a reranker down for a week is otherwise invisible. Both series report `0` from process start, so absent-vs-zero is never ambiguous. |
| `ythril_media_jobs_pending` | gauge | Queued media/document embedding jobs by space |
| `ythril_media_jobs_processing` | gauge | Jobs a worker is currently running, by space. **One long document shows as `1` here for its whole duration** — pair it with `ythril_embed_chunks_total` to tell slow from stuck |
| `ythril_media_job_phase` | gauge | In-flight jobs by the pipeline step they are in (`render`, `vlm`, `embed`, `describe`, …, or `unknown` for a job that has not reported one). The known step names are **seeded at `0` from the first scrape**, so the series exists before any job has been in them; an unlisted step appears the moment it is seen |
| `ythril_embed_chunks_total` | counter | Chunks put through the embedder, by space. Motion, not success: `rate(...[5m]) == 0` while `ythril_media_jobs_processing > 0` is a stuck job, a non-zero rate is a slow one — **but see the restart caveat below before alerting on it** |
| `ythril_media_jobs_completed_total` | counter | Jobs that finished, by space and media type |
| `ythril_media_jobs_failed_total` | counter | Jobs that exhausted their retries, by space and media type |
| `ythril_media_jobs_retried_total` | counter | Attempts that failed and were re-queued, by space and media type — including a job whose claim was recovered while it was still running |
| `ythril_media_jobs_failed` | gauge | Jobs sitting in the terminal `failed` state by space (a backlog, not a rate) |
| `ythril_media_job_duration_seconds` | histogram | End-to-end time per job by media type |
| `ythril_security_posture_checks` | gauge | This instance's own PASS/WARN/FAIL posture, by `level` — the same findings the boot log prints and `GET /api/about/security` serves, computed per scrape from the same function. **Alert on `level="fail"` > 0**: the checks that matter most produce no runtime symptom at all (`requireEncryptedTransport` on *without* `trustProxy` rejects every request with a 403 that looks like a client problem), and the only other way to notice was somebody reading the boot log of each instance. All three levels report `0` from process start. |

> **The stuck-job recipe needs a restart guard.** A counter **resets to zero on restart**, so
> `rate(ythril_embed_chunks_total[5m])` is 0 for the first five minutes of a new process while jobs are
> completing normally. A reporting operator built the alert exactly as recommended and it fired two minutes
> after an OOM restart, with the log showing jobs finishing — which is the worst moment to page someone.
>
> Either give it a long `for:` (15 m covers the window), or exclude a young process outright:
>
> ```promql
> rate(ythril_embed_chunks_total[5m]) == 0
>   and ythril_media_jobs_processing > 0
>   and (time() - process_start_time_seconds) > 600
> ```
>
> `ythril_media_job_phase` is the better first look during an incident anyway: it says which step, not just
> whether anything moved.

Default Node.js process metrics (`nodejs_*`, `process_*`) are also included via [prom-client](https://github.com/siimon/prom-client)'s `collectDefaultMetrics()`.

**Correlating a failure with its log line.** Every response carries an `X-Request-Id` header, and the server
logs that id with any unhandled error (`Unhandled error [<id>]: …`). The admin UI now **shows the id in the
message** for a server-side failure (5xx, or a request that got no answer at all), so a bug report can quote
it and an operator can grep for it. It is deliberately not appended to a 4xx: a validation message explains
itself, and an id on every one of them trains people to ignore the id when it matters.

**Kubernetes example** (Prometheus Operator `ServiceMonitor`):

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ythril
spec:
  selector:
    matchLabels:
      app: ythril
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
      authorization:
        credentials:
          name: ythril-metrics-token   # Secret containing METRICS_TOKEN value
          key: token
```

---

### Check Setup Status (unauthenticated)

```http
GET /api/setup/status
```

**Response** `200`:

```json
{ "configured": false }
```

---

### Legacy First-Run HTML Setup

These routes are primarily for non-SPA/manual first-run flows.

```http
GET /setup
POST /setup
```

Equivalent paths also exist under the API mount:

```http
GET /api/setup
POST /api/setup
```

Behaviour:

- `GET` returns an HTML setup form when instance configuration does not exist.
- `POST` accepts form data (`label`) and returns an HTML page containing the one-time initial admin token.
- If already configured, both return `404`.

For programmatic setup, prefer `POST /api/setup/json`.

---

### Complete Setup (JSON)

```http
POST /api/setup/json
```

```json
{
  "label": "My Ythril"
}
```

The `label` names this brain instance.

**Response** `201`:

```json
{
  "token": { "id": "...", "name": "Admin", "admin": true, ... },
  "plaintext": "ythril_initialAdminToken..."
}
```

---
