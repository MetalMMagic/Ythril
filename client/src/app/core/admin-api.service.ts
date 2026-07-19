import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AboutInfo, AuditLogParams, AuditLogResponse, BackupConfigData,
  WebhookSubscription, WebhookUpsert, WebhookDelivery,
} from './api.types';

/** Instance administration — about/logs, audit log, and data/backup/migration/maintenance. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);

  // ── About ───────────────────────────────────────────────────────────────

  getAbout(): Observable<AboutInfo> {
    return this.http.get<AboutInfo>('/api/about');
  }

  getAboutLogs(lines: number = 200): Observable<{ lines: string[] }> {
    return this.http.get<{ lines: string[] }>(`/api/about/logs?lines=${lines}`);
  }

  /** Mint a single-use ticket to open the log-stream SSE (keeps the admin token out of the URL). */
  mintLogsTicket(): Observable<{ ticket: string; expiresInMs: number }> {
    return this.http.post<{ ticket: string; expiresInMs: number }>('/api/about/logs/ticket', {});
  }

  // ── Audit Log ───────────────────────────────────────────────────────────

  getAuditLog(params: AuditLogParams = {}): Observable<AuditLogResponse> {
    let p = new HttpParams();
    if (params.after) p = p.set('after', params.after);
    if (params.before) p = p.set('before', params.before);
    if (params.tokenId) p = p.set('tokenId', params.tokenId);
    if (params.oidcSubject) p = p.set('oidcSubject', params.oidcSubject);
    if (params.spaceId) p = p.set('spaceId', params.spaceId);
    if (params.operation) p = p.set('operation', params.operation);
    if (params.status !== undefined) p = p.set('status', String(params.status));
    if (params.ip) p = p.set('ip', params.ip);
    if (params.limit !== undefined) p = p.set('limit', String(params.limit));
    if (params.offset !== undefined) p = p.set('offset', String(params.offset));
    return this.http.get<AuditLogResponse>('/api/admin/audit-log', { params: p });
  }

  // ── Data management ───────────────────────────────────────────────────────

  getDataConfig(): Observable<{ source: 'env' | 'config' | 'default'; mongoUriRedacted: string; migrationEnabled: boolean }> {
    return this.http.get<{ source: 'env' | 'config' | 'default'; mongoUriRedacted: string; migrationEnabled: boolean }>('/api/admin/data/config');
  }

  testMongoConnection(uri: string): Observable<{ ok: boolean; error?: string }> {
    return this.http.post<{ ok: boolean; error?: string }>('/api/admin/data/config/test', { uri });
  }

  getMaintenanceStatus(): Observable<{ active: boolean }> {
    return this.http.get<{ active: boolean }>('/api/admin/data/maintenance');
  }

  setMaintenance(active: boolean): Observable<{ active: boolean }> {
    return this.http.post<{ active: boolean }>('/api/admin/data/maintenance', { active });
  }

  triggerBackup(): Observable<{ backup: { id: string; dir: string; manifest: unknown } }> {
    return this.http.post<{ backup: { id: string; dir: string; manifest: unknown } }>('/api/admin/data/backup', {});
  }

  listBackups(): Observable<{ backups: Array<{ id: string; createdAt: string; collections: unknown[] }> }> {
    return this.http.get<{ backups: Array<{ id: string; createdAt: string; collections: unknown[] }> }>('/api/admin/data/backups');
  }

  restoreBackup(backupId: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>('/api/admin/data/restore', { backupId });
  }

  startMigration(uri: string): Observable<{ ok: boolean; backupDir: string; manifest: unknown }> {
    return this.http.post<{ ok: boolean; backupDir: string; manifest: unknown }>('/api/admin/data/migrate', { uri });
  }

  getBackupConfig(): Observable<{ config: BackupConfigData | null; backupsPath?: string }> {
    return this.http.get<{ config: BackupConfigData | null; backupsPath?: string }>('/api/admin/data/backup-config');
  }

  saveBackupConfig(config: BackupConfigData): Observable<{ ok: boolean; config: BackupConfigData }> {
    return this.http.put<{ ok: boolean; config: BackupConfigData }>('/api/admin/data/backup-config', config);
  }

  browseDirs(dirPath: string): Observable<{ path: string; dirs: string[] }> {
    return this.http.get<{ path: string; dirs: string[] }>('/api/admin/data/browse-dirs', {
      params: { path: dirPath },
    });
  }

  // ── Webhooks (C1) ─────────────────────────────────────────────────────────
  // All routes require admin + MFA server-side; the mfa.interceptor handles the challenge/retry.

  listWebhooks(): Observable<{ webhooks: WebhookSubscription[] }> {
    return this.http.get<{ webhooks: WebhookSubscription[] }>('/api/admin/webhooks');
  }

  createWebhook(body: WebhookUpsert): Observable<WebhookSubscription> {
    return this.http.post<WebhookSubscription>('/api/admin/webhooks', body);
  }

  updateWebhook(id: string, patch: WebhookUpsert): Observable<WebhookSubscription> {
    return this.http.patch<WebhookSubscription>(`/api/admin/webhooks/${encodeURIComponent(id)}`, patch);
  }

  deleteWebhook(id: string): Observable<void> {
    return this.http.delete<void>(`/api/admin/webhooks/${encodeURIComponent(id)}`);
  }

  testWebhook(id: string): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(`/api/admin/webhooks/${encodeURIComponent(id)}/test`, {});
  }

  getWebhookDeliveries(id: string): Observable<{ deliveries: WebhookDelivery[] }> {
    return this.http.get<{ deliveries: WebhookDelivery[] }>(`/api/admin/webhooks/${encodeURIComponent(id)}/deliveries`);
  }
}
