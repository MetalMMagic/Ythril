import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Instance administration — about/logs, audit log, and data/backup/migration/maintenance. */
export class AdminApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    // ── About ───────────────────────────────────────────────────────────────
    getAbout() {
        return this.http.get('/api/about');
    }
    /** Optional-component liveness for the Instance panel. Admin-only. */
    getAboutHealth() {
        return this.http.get('/api/about/health');
    }
    getAboutLogs(lines = 200) {
        return this.http.get(`/api/about/logs?lines=${lines}`);
    }
    /** Mint a single-use ticket to open the log-stream SSE (keeps the admin token out of the URL). */
    mintLogsTicket() {
        return this.http.post('/api/about/logs/ticket', {});
    }
    // ── Audit Log ───────────────────────────────────────────────────────────
    getAuditLog(params = {}) {
        let p = new HttpParams();
        if (params.after)
            p = p.set('after', params.after);
        if (params.before)
            p = p.set('before', params.before);
        if (params.tokenId)
            p = p.set('tokenId', params.tokenId);
        if (params.oidcSubject)
            p = p.set('oidcSubject', params.oidcSubject);
        if (params.spaceId)
            p = p.set('spaceId', params.spaceId);
        if (params.operation)
            p = p.set('operation', params.operation);
        if (params.status !== undefined)
            p = p.set('status', String(params.status));
        if (params.ip)
            p = p.set('ip', params.ip);
        if (params.limit !== undefined)
            p = p.set('limit', String(params.limit));
        if (params.offset !== undefined)
            p = p.set('offset', String(params.offset));
        return this.http.get('/api/admin/audit-log', { params: p });
    }
    /**
     * Every entry matching the filters, as NDJSON — not just the page on screen.
     *
     * Fetched through `HttpClient` rather than an `<a download>` or `window.open`, deliberately: this endpoint
     * requires the second factor, and `mfaInterceptor` can only prompt-and-retry for requests that pass through
     * Angular's HTTP stack. A plain link would simply 403 on any instance with MFA enabled.
     *
     * That means the body is buffered in the browser before it is saved. Acceptable for a text record and
     * unavoidable given the above — a very large export is better done with `curl`, which the API docs show.
     *
     * `limit`/`offset` are not sent: the server ignores them, and passing them would suggest they narrowed the file.
     */
    exportAuditLog(params = {}) {
        let p = new HttpParams();
        if (params.after)
            p = p.set('after', params.after);
        if (params.before)
            p = p.set('before', params.before);
        if (params.tokenId)
            p = p.set('tokenId', params.tokenId);
        if (params.oidcSubject)
            p = p.set('oidcSubject', params.oidcSubject);
        if (params.spaceId)
            p = p.set('spaceId', params.spaceId);
        if (params.operation)
            p = p.set('operation', params.operation);
        if (params.status !== undefined)
            p = p.set('status', String(params.status));
        if (params.ip)
            p = p.set('ip', params.ip);
        return this.http.get('/api/admin/audit-log/export', { params: p, responseType: 'blob' });
    }
    // ── Data management ───────────────────────────────────────────────────────
    getDataConfig() {
        return this.http.get('/api/admin/data/config');
    }
    testMongoConnection(uri) {
        return this.http.post('/api/admin/data/config/test', { uri });
    }
    getMaintenanceStatus() {
        return this.http.get('/api/admin/data/maintenance');
    }
    setMaintenance(active) {
        return this.http.post('/api/admin/data/maintenance', { active });
    }
    triggerBackup() {
        return this.http.post('/api/admin/data/backup', {});
    }
    listBackups() {
        return this.http.get('/api/admin/data/backups');
    }
    restoreBackup(backupId) {
        return this.http.post('/api/admin/data/restore', { backupId });
    }
    startMigration(uri) {
        return this.http.post('/api/admin/data/migrate', { uri });
    }
    getBackupConfig() {
        return this.http.get('/api/admin/data/backup-config');
    }
    saveBackupConfig(config) {
        return this.http.put('/api/admin/data/backup-config', config);
    }
    browseDirs(dirPath) {
        return this.http.get('/api/admin/data/browse-dirs', {
            params: { path: dirPath },
        });
    }
    // ── Webhooks (C1) ─────────────────────────────────────────────────────────
    // All routes require admin + MFA server-side; the mfa.interceptor handles the challenge/retry.
    listWebhooks() {
        return this.http.get('/api/admin/webhooks');
    }
    createWebhook(body) {
        return this.http.post('/api/admin/webhooks', body);
    }
    updateWebhook(id, patch) {
        return this.http.patch(`/api/admin/webhooks/${encodeURIComponent(id)}`, patch);
    }
    deleteWebhook(id) {
        return this.http.delete(`/api/admin/webhooks/${encodeURIComponent(id)}`);
    }
    testWebhook(id) {
        return this.http.post(`/api/admin/webhooks/${encodeURIComponent(id)}/test`, {});
    }
    getWebhookDeliveries(id) {
        return this.http.get(`/api/admin/webhooks/${encodeURIComponent(id)}/deliveries`);
    }
    static { this.ɵfac = function AdminApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || AdminApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: AdminApi, factory: AdminApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(AdminApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
