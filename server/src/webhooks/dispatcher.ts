/**
 * Webhook event dispatcher — emits events to matching subscriptions.
 *
 * - HMAC-SHA256 signature using the subscription's shared secret
 * - At-least-once delivery with exponential backoff retries
 * - MongoDB-backed retry queue — retries survive process restarts
 * - Delivery logging for debugging
 * - Fire-and-forget from the caller's perspective (non-blocking)
 */

import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import type { Filter, Sort } from 'mongodb';
import { getMatchingWebhooks, getWebhookFull, recordDelivery, markWebhookSuccess, markWebhookFailure } from './store.js';
import { col } from '../db/mongo.js';
import { getConfig } from '../config/loader.js';
import { log } from '../util/log.js';
import type { WebhookEventType, WebhookEventPayload, WebhookDelivery, WebhookSubscription } from './types.js';

/** Retry schedule in milliseconds: 10s, 30s, 1m, 5m, 30m, 1h */
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000, 300_000, 1_800_000, 3_600_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
const DELIVERY_TIMEOUT_MS = 10_000;
const RETRY_COLLECTION = '_webhook_retry_queue';
const RETRY_POLL_INTERVAL_MS = 10_000;

// ── Retry queue document ────────────────────────────────────────────────────

interface RetryJob {
  _id: string;
  webhookId: string;
  body: string;
  event: WebhookEventType;
  spaceId: string;
  deliveryId: string;
  attempt: number;
  scheduledAt: Date;
  createdAt: Date;
}

// ── Retry worker ────────────────────────────────────────────────────────────

let _retryTimer: ReturnType<typeof setInterval> | null = null;

/** Start the background retry queue poller. Call once during startup. */
export function startRetryWorker(): void {
  if (_retryTimer) return;
  _retryTimer = setInterval(processRetryQueue, RETRY_POLL_INTERVAL_MS);
  _retryTimer.unref(); // don't prevent process exit
  log.debug('Webhook retry worker started');
}

/** Stop the retry queue poller. Called during graceful shutdown. */
export function stopRetryWorker(): void {
  if (_retryTimer) {
    clearInterval(_retryTimer);
    _retryTimer = null;
  }
}

async function processRetryQueue(): Promise<void> {
  try {
    const now = new Date();
    const jobs = await col<RetryJob>(RETRY_COLLECTION)
      .find({ scheduledAt: { $lte: now } } as Filter<RetryJob>)
      .sort({ scheduledAt: 1 } as Sort)
      .limit(50)
      .toArray() as RetryJob[];

    for (const job of jobs) {
      // Remove from queue before delivery attempt (at-least-once: if we crash
      // mid-delivery, the webhook gets a duplicate rather than being lost).
      await col<RetryJob>(RETRY_COLLECTION).deleteOne({ _id: job._id } as Filter<RetryJob>);

      const sub = await getWebhookFull(job.webhookId);
      if (!sub) continue; // webhook deleted while retry was queued

      const result = await attemptDelivery(sub, job.body, job.event, job.spaceId, job.deliveryId);

      if (result.success) {
        await markWebhookSuccess(sub.id);
      } else if (job.attempt < MAX_ATTEMPTS) {
        await enqueueRetry(job.webhookId, job.body, job.event, job.spaceId, job.deliveryId, job.attempt + 1);
        log.warn(`Webhook retry ${job.attempt}/${MAX_ATTEMPTS} failed for ${job.webhookId}: ${result.error ?? `HTTP ${result.responseStatus}`}`);
      } else {
        await markWebhookFailure(sub.id);
        log.error(`Webhook ${sub.id} marked as failing after ${MAX_ATTEMPTS} delivery attempts`);
      }
    }
  } catch (err) {
    log.warn(`Webhook retry queue error: ${err}`);
  }
}

async function enqueueRetry(
  webhookId: string,
  body: string,
  event: WebhookEventType,
  spaceId: string,
  deliveryId: string,
  attempt: number,
): Promise<void> {
  const delayMs = RETRY_DELAYS_MS[attempt - 2] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
  const job: RetryJob = {
    _id: uuidv4(),
    webhookId,
    body,
    event,
    spaceId,
    deliveryId,
    attempt,
    scheduledAt: new Date(Date.now() + delayMs),
    createdAt: new Date(),
  };
  await col<RetryJob>(RETRY_COLLECTION).insertOne(job as any);
}

// ── Public emit API ─────────────────────────────────────────────────────────

export interface EmitWebhookEventOptions {
  event: WebhookEventType;
  spaceId: string;
  entry: Record<string, unknown>;
  tokenId?: string;
  tokenLabel?: string;
}

/**
 * Emit a webhook event. This is fire-and-forget — callers should not await.
 * Matching subscriptions are resolved, payloads signed, and HTTP POSTs
 * dispatched asynchronously. Failures are retried via the MongoDB retry queue.
 */
export function emitWebhookEvent(opts: EmitWebhookEventOptions): void {
  _emitAsync(opts).catch(err => {
    log.warn(`Webhook emit error: ${err}`);
  });
}

async function _emitAsync(opts: EmitWebhookEventOptions): Promise<void> {
  const { event, spaceId, entry, tokenId, tokenLabel } = opts;

  const subs = await getMatchingWebhooks(event, spaceId);
  if (subs.length === 0) return;

  const cfg = getConfig();
  const space = cfg.spaces.find(s => s.id === spaceId);
  const spaceName = space?.label ?? spaceId;

  const payload: WebhookEventPayload = {
    event,
    timestamp: new Date().toISOString(),
    spaceId,
    spaceName,
    entry,
    ...(tokenId ? { tokenId } : {}),
    ...(tokenLabel ? { tokenLabel } : {}),
  };

  const body = JSON.stringify(payload);

  for (const sub of subs) {
    const full = await getWebhookFull(sub.id);
    if (!full) continue;

    deliverFirst(full, body, event, spaceId).catch(err => {
      log.warn(`Webhook delivery error for ${sub.id}: ${err}`);
    });
  }
}

/**
 * Deliver a webhook payload to a specific subscription (first attempt).
 * If delivery fails, enqueue for retry instead of sleeping.
 */
async function deliverFirst(
  sub: WebhookSubscription,
  body: string,
  event: WebhookEventType,
  spaceId: string,
): Promise<void> {
  const deliveryId = uuidv4();
  const result = await attemptDelivery(sub, body, event, spaceId, deliveryId);

  if (result.success) {
    await markWebhookSuccess(sub.id);
  } else {
    // Enqueue first retry (attempt 2)
    await enqueueRetry(sub.id, body, event, spaceId, deliveryId, 2);
    log.warn(`Webhook first delivery failed for ${sub.id}: ${result.error ?? `HTTP ${result.responseStatus}`} — queued for retry`);
  }
}

/**
 * Deliver directly to a single webhook — used by the test endpoint.
 * Does NOT enqueue retries on failure (test is one-shot).
 */
export async function deliverToWebhook(
  sub: WebhookSubscription,
  body: string,
  event: WebhookEventType,
  spaceId: string,
): Promise<void> {
  const deliveryId = uuidv4();
  const result = await attemptDelivery(sub, body, event, spaceId, deliveryId);
  if (result.success) {
    await markWebhookSuccess(sub.id);
  } else {
    log.warn(`Test webhook delivery failed for ${sub.id}: ${result.error ?? `HTTP ${result.responseStatus}`}`);
  }
}

// ── Delivery attempt ────────────────────────────────────────────────────────

async function attemptDelivery(
  sub: WebhookSubscription,
  body: string,
  event: WebhookEventType,
  spaceId: string,
  deliveryId: string,
): Promise<WebhookDelivery> {
  const start = Date.now();
  const signature = computeHmac(sub.secret, body);

  const delivery: WebhookDelivery = {
    id: deliveryId,
    webhookId: sub.id,
    event,
    spaceId,
    timestamp: new Date().toISOString(),
    responseStatus: 0,
    latencyMs: 0,
    success: false,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const resp = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ythril-Signature': `sha256=${signature}`,
        'X-Ythril-Event': event,
        'X-Ythril-Delivery': deliveryId,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    delivery.responseStatus = resp.status;
    delivery.latencyMs = Date.now() - start;
    delivery.success = resp.status >= 200 && resp.status < 300;
    if (!delivery.success) {
      delivery.error = `HTTP ${resp.status}`;
    }
  } catch (err) {
    delivery.latencyMs = Date.now() - start;
    delivery.error = err instanceof Error ? err.message : String(err);
  }

  // Record delivery — fire and forget
  recordDelivery(delivery).catch(() => {});

  return delivery;
}

// ── HMAC ────────────────────────────────────────────────────────────────────

function computeHmac(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
