import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as i0 from "@angular/core";
/** Networks, sync scheduling/triggering, governance votes, invites, and the local agent. */
export class NetworksApi {
    constructor() {
        this.http = inject(HttpClient);
    }
    // ── Networks ──────────────────────────────────────────────────────────────
    listNetworks() {
        return this.http.get('/api/networks');
    }
    getNetwork(id) {
        return this.http.get(`/api/networks/${id}`);
    }
    getSyncHistory(networkId, limit = 20) {
        return this.http.get(`/api/networks/${networkId}/sync-history?limit=${limit}`);
    }
    createNetwork(body) {
        return this.http.post('/api/networks', body);
    }
    leaveNetwork(id) {
        return this.http.delete(`/api/networks/${id}`, { body: { confirm: true } });
    }
    generateInvite(networkId) {
        return this.http.post('/api/invite/generate', { networkId });
    }
    joinRemote(body) {
        return this.http.post('/api/networks/join-remote', body);
    }
    removeMember(networkId, instanceId) {
        return this.http.delete(`/api/networks/${networkId}/members/${instanceId}`);
    }
    updateNetworkSchedule(networkId, syncSchedule) {
        return this.http.patch(`/api/networks/${networkId}`, { syncSchedule });
    }
    updateSyncSchedule(networkId, memberId, schedule) {
        return this.http.patch(`/api/networks/${networkId}/members/${memberId}`, { syncSchedule: schedule });
    }
    triggerSync(networkId) {
        return this.http.post(`/api/networks/${networkId}/sync`, {});
    }
    castVote(networkId, roundId, vote) {
        return this.http.post(`/api/networks/${networkId}/votes/${roundId}`, { vote });
    }
    listVotes(networkId) {
        return this.http.get(`/api/networks/${networkId}/votes`);
    }
    // ── Local agent ─────────────────────────────────────────────────────────
    getLocalAgentStatus() {
        return this.http.get('/api/admin/local-agent/status');
    }
    bootstrapLocalAgent(body) {
        return this.http.post('/api/admin/local-agent/bootstrap', body);
    }
    executeEnableNetworksViaLocalAgent(body) {
        return this.http.post('/api/admin/local-agent/enable-networks/execute', body);
    }
    static { this.ɵfac = function NetworksApi_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || NetworksApi)(); }; }
    static { this.ɵprov = /*@__PURE__*/ i0.ɵɵdefineInjectable({ token: NetworksApi, factory: NetworksApi.ɵfac, providedIn: 'root' }); }
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(NetworksApi, [{
        type: Injectable,
        args: [{ providedIn: 'root' }]
    }], null, null); })();
