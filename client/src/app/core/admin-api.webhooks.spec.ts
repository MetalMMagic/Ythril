/**
 * C1 — AdminApi webhook methods hit the right URL/verb/body.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminApi } from './admin-api.service';

describe('AdminApi — webhooks (C1)', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AdminApi, provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('list → GET /api/admin/webhooks', () => {
    api.listWebhooks().subscribe();
    const r = http.expectOne('/api/admin/webhooks');
    expect(r.request.method).toBe('GET');
    r.flush({ webhooks: [] });
  });

  it('create → POST with the body', () => {
    const body = { url: 'https://x.example.com/h', secret: 'longenough', events: [], spaces: [], enabled: true };
    api.createWebhook(body).subscribe();
    const r = http.expectOne('/api/admin/webhooks');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(body);
    r.flush({ id: 'w1' });
  });

  it('update → PATCH /:id (id encoded)', () => {
    api.updateWebhook('w 1', { enabled: false }).subscribe();
    const r = http.expectOne('/api/admin/webhooks/w%201');
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual({ enabled: false });
    r.flush({ id: 'w 1' });
  });

  it('delete → DELETE /:id', () => {
    api.deleteWebhook('w1').subscribe();
    const r = http.expectOne('/api/admin/webhooks/w1');
    expect(r.request.method).toBe('DELETE');
    r.flush(null);
  });

  it('test → POST /:id/test', () => {
    api.testWebhook('w1').subscribe();
    const r = http.expectOne('/api/admin/webhooks/w1/test');
    expect(r.request.method).toBe('POST');
    r.flush({ ok: true, message: 'queued' });
  });

  it('deliveries → GET /:id/deliveries', () => {
    api.getWebhookDeliveries('w1').subscribe();
    const r = http.expectOne('/api/admin/webhooks/w1/deliveries');
    expect(r.request.method).toBe('GET');
    r.flush({ deliveries: [] });
  });
});
