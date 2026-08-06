/**
 * Shared HTTP helpers for integration tests.
 * Assumes instances are running at http://localhost:320{0,1,2}.
 */

import { execSync } from 'node:child_process';

/** Synchronous sleep (these container-config readers are called synchronously). */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Run a `docker exec` command, retrying on transient failure.
 *
 * The server persists config.json via an atomic temp-file + rename. Across a
 * Docker bind mount (notably Docker Desktop on Windows), that rename has a brief
 * non-atomic window where a concurrent read can observe the file as missing
 * (ENOENT) or half-written. Because the sync engine calls saveConfig frequently
 * (watermarks, gossip merges), a test that reads a container's config via
 * `docker exec` can race a write — so we retry to ride out the window.
 */
export function dockerExec(cmd, { retries = 10, delayMs = 150 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (err) {
      lastErr = err;
      if (i < retries) sleepSync(delayMs);
    }
  }
  throw lastErr;
}

/** Read and parse a container's /config/config.json (resilient to write races). */
export function readContainerConfig(container) {
  return JSON.parse(dockerExec(`docker exec ${container} node -e "const fs=require('fs');process.stdout.write(fs.readFileSync('/config/config.json','utf8'))"`));
}

/** Read and parse a container's /config/secrets.json (resilient to write races). */
export function readContainerSecrets(container) {
  return JSON.parse(dockerExec(`docker exec ${container} node -e "const fs=require('fs');process.stdout.write(fs.readFileSync('/config/secrets.json','utf8'))"`));
}

/** Read a container's instanceId from its config (resilient to write races). */
export function getInstanceId(container) {
  return dockerExec(`docker exec ${container} node -e "const fs=require('fs');const c=JSON.parse(fs.readFileSync('/config/config.json','utf8'));process.stdout.write(c.instanceId)"`).trim();
}

export const INSTANCES = {
  a: 'http://127.0.0.1:3200',
  b: 'http://127.0.0.1:3201',
  c: 'http://127.0.0.1:3202',
  d: 'http://127.0.0.1:3203',
};

/**
 * Make an authenticated request.
 * @param {string} baseUrl  - instance base URL
 * @param {string} token    - PAT token
 * @param {string} path     - URL path including leading /
 * @param {RequestInit} opts
 */
export async function req(baseUrl, token, path, opts = {}) {
  const url = `${baseUrl}${path}`;
  const resp = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
  return resp;
}

/** req() but parse JSON body automatically */
export async function reqJson(baseUrl, token, path, opts = {}) {
  const resp = await req(baseUrl, token, path, opts);
  const body = await resp.json().catch(() => null);
  return { status: resp.status, body };
}

/** POST with JSON body */
export async function post(baseUrl, token, path, data) {
  return reqJson(baseUrl, token, path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * POST with automatic retry on 429 (rate limit).
 * Reads the standard Retry-After HTTP header (seconds); defaults to 5 s.
 */
export async function postRetry429(baseUrl, token, path, data, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const resp = await req(baseUrl, token, path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (resp.status !== 429) {
      const body = await resp.json().catch(() => null);
      return { status: resp.status, body };
    }
    const retryAfter = parseInt(resp.headers.get('retry-after') ?? '5', 10);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  }
  // final attempt — return whatever we get
  return post(baseUrl, token, path, data);
}

/** PATCH with JSON body */
export async function patch(baseUrl, token, path, data) {
  return reqJson(baseUrl, token, path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** PUT with JSON body */
export async function put(baseUrl, token, path, data) {
  return reqJson(baseUrl, token, path, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** DELETE */
export async function del(baseUrl, token, path) {
  return reqJson(baseUrl, token, path, { method: 'DELETE' });
}

/** DELETE with JSON body */
export async function delWithBody(baseUrl, token, path, data) {
  return reqJson(baseUrl, token, path, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

/** GET */
export async function get(baseUrl, token, path) {
  return reqJson(baseUrl, token, path);
}

/**
 * Poll until condition() returns true or timeout (ms).
 *
 * `diagnose` (string or fn) is appended to the timeout message. Use it to explain WHY
 * the wait failed — a bare "timed out after 90000ms" is nearly useless, and actively
 * dangerous: a persistent, actionable error can masquerade as a mysterious flake. That
 * is exactly how the notify rate-limit bug hid for weeks — every sync trigger was being
 * rejected with 429, the tests swallowed it, and all we ever saw was a timeout.
 */
export async function waitFor(condition, timeout = 15_000, interval = 500, diagnose) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return true;
    await new Promise(r => setTimeout(r, interval));
  }
  const detail = typeof diagnose === 'function' ? diagnose() : diagnose;
  throw new Error(`waitFor timed out after ${timeout}ms${detail ? ` — ${detail}` : ''}`);
}

/**
 * Wait until every id is visible to `$vectorSearch`, then return how long it took.
 *
 * ## Why this is one helper and not four copies of a 30-second timeout
 *
 * The Atlas Local vector index is **eventually consistent**: a record that came back 201 is not yet visible to
 * `$vectorSearch`, and nothing in the write path tells you when it will be. Four test files each grew their own
 * copy of this poll, each with a 30 s deadline that nobody had measured against anything.
 *
 * The lag has been observed at up to **150 s** on the CI runner. So the deadline was not conservative, it was
 * simply wrong, and its failure — `Timed out waiting for indexing of: <uuid>` inside a `before` hook — cancels
 * every test in the suite and reads exactly like a real regression. That has now failed CI four separate times.
 *
 * `INDEX_LAG_TIMEOUT_MS` is deliberately well beyond the worst observation rather than just past it. **This costs
 * nothing when the index is quick** — the poll returns on the first hit — so the only thing a bigger number buys
 * is not failing, and the only thing a smaller one buys is failing sooner on a slow runner.
 *
 * A test that does NOT need the index should not call this at all; prefer asserting on what the record itself
 * returns. `embed-properties` was rewritten that way and stopped flaking entirely.
 *
 * @param types Record types to poll. Narrow it — polling for types you did not write cannot succeed.
 */
export const INDEX_LAG_TIMEOUT_MS = 300_000;

export async function waitForIndexed(baseUrl, token, spaceId, ids, types, timeoutMs = INDEX_LAG_TIMEOUT_MS) {
  const pending = new Set(ids);
  const started = Date.now();
  const deadline = started + timeoutMs;
  let lastStatus = null;
  let polls = 0;
  while (pending.size > 0 && Date.now() < deadline) {
    const r = await post(baseUrl, token, `/api/brain/spaces/${spaceId}/recall`,
      { query: 'indexing probe query', types, topK: 100 });
    polls++;
    lastStatus = r.status;
    if (r.status === 200 && Array.isArray(r.body?.results)) {
      // Both shapes, because the four copies of this poll did not agree on one: most read `result._id`, one read
      // `result.record?._id ?? result._id`. A copy that guesses wrong never matches anything and times out in
      // full — a hard failure that looks exactly like index lag. Accepting both is the only version that cannot
      // be silently wrong.
      for (const result of r.body.results) pending.delete(result.record?._id ?? result._id);
    }
    if (pending.size > 0) await new Promise(res => setTimeout(res, 500));
  }
  if (pending.size > 0) {
    // Say which of the two failures this is. A recall that never returned 200 is a broken instance and has
    // nothing to do with index lag, but the old message described both as "timed out waiting for indexing".
    const how = lastStatus === 200
      ? `recall answered 200 every time and never listed them, over ${polls} polls`
      : `the last recall returned ${lastStatus} — this is not index lag, recall itself is failing`;
    throw new Error(
      `Timed out after ${Math.round((Date.now() - started) / 1000)}s waiting for $vectorSearch to see `
      + `${[...pending].join(', ')} in space ${spaceId} (types: ${types.join(',')}): ${how}`);
  }
  return Date.now() - started;
}

/** Trigger a sync run on an instance for a given networkId. Throws on any non-200. */
export async function triggerSync(baseUrl, token, networkId) {
  const r = await post(baseUrl, token, '/api/notify/trigger', { networkId });
  if (r.status !== 200) throw new Error(`triggerSync failed: ${r.status} ${JSON.stringify(r.body)}`);
}

/**
 * Build a sync trigger for use INSIDE a waitFor poll.
 *
 * Re-triggering each poll is deliberate (a single up-front trigger races a slow gossip
 * cycle), but a naked `triggerSync(...).catch(() => {})` is a trap: it tolerates a
 * transient blip and a permanent misconfiguration identically, and the latter then
 * shows up only as an unexplained timeout.
 *
 * This tolerates failures so one bad poll doesn't fail the test, but REMEMBERS the last
 * one. Pass `probe.diagnose` to waitFor so a persistent failure is reported as itself
 * (e.g. "429 Too Many Requests") instead of a silent stall.
 */
export function makeTriggerProbe(baseUrl, token, networkId, label = baseUrl) {
  const probe = async () => {
    try {
      await triggerSync(baseUrl, token, networkId);
      probe.lastError = null;
      probe.okCount++;
    } catch (err) {
      probe.lastError = err;
      probe.failCount++;
    }
  };
  probe.lastError = null;
  probe.okCount = 0;
  probe.failCount = 0;
  probe.diagnose = () =>
    probe.lastError
      ? `every sync trigger to ${label} was failing (${probe.failCount} failed / ${probe.okCount} ok); last error: ${probe.lastError.message}`
      : `sync triggers to ${label} all succeeded (${probe.okCount}) — the peer simply never delivered the expected state`;
  return probe;
}

/**
 * Trigger a sync and poll `condition` until it holds, RE-triggering while waiting.
 *
 * ## The three-part failure this replaces
 *
 * 23 call sites across ten sync/integration files were `await triggerSync(...)` followed by a bare `waitFor`.
 * Each one has three defects that only show up together, on a slow runner:
 *
 *   1. **One trigger races the gossip cycle.** If that single async fire is queued behind other work, nothing
 *      arrives and the poll expires having waited for something nobody asked for a second time.
 *   2. **A bare timeout cannot tell a stall from a rejection.** `waitFor timed out after 15000ms` reports a
 *      persistently-429'd trigger, a misconfigured network id and a merely-slow peer identically. That exact
 *      message is how the notify rate-limit bug hid for weeks.
 *   3. **It does not say what it was waiting for.** A test with two identical waits names neither.
 *
 * `closed-network.test.js` had already worked this out and hand-rolled it at ONE of its four sites; the other
 * three, and every other file, kept the bare form. Which is the argument for a helper rather than a comment.
 *
 * @param what Human phrase completing "waiting for …". Appears in the timeout message; not optional, because
 *   the whole point is that the failure explains itself.
 */
export async function syncUntil(baseUrl, token, networkId, condition, what, { timeoutMs = 25_000, interval = 500, retriggerMs = 3_000, label } = {}) {
  await triggerSync(baseUrl, token, networkId);
  const probe = makeTriggerProbe(baseUrl, token, networkId, label ?? baseUrl);
  const retrigger = setInterval(() => { void probe(); }, retriggerMs);
  try {
    return await waitFor(condition, timeoutMs, interval, () => `waiting for ${what} — ${probe.diagnose()}`);
  } finally {
    clearInterval(retrigger);
  }
}

/** Create a memory on an instance's general space */
export async function createMemory(baseUrl, token, fact, tags = []) {
  return post(baseUrl, token, '/api/brain/spaces/general/memories', { fact, tags });
}

/**
 * List ALL memories on an instance's general space.
 * Pages through the API (up to 500 per request) until exhausted so callers
 * never silently receive a truncated result.
 */
export async function listMemories(baseUrl, token) {
  const all = [];
  let skip = 0;
  const pageSize = 500;
  while (true) {
    const r = await get(baseUrl, token, `/api/brain/spaces/general/memories?limit=${pageSize}&skip=${skip}`);
    if (r.status !== 200) return r; // surface errors to callers as-is
    const page = r.body.memories ?? [];
    all.push(...page);
    if (page.length < pageSize) break;
    skip += pageSize;
  }
  return { status: 200, body: { memories: all } };
}
