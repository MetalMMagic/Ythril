import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { ContradictionRecord } from './api.types';

/** Contradiction candidates: list, dismiss, re-open, resolve, and rescan. Mirrors DuplicatesApi. */
@Injectable({ providedIn: 'root' })
export class ContradictionsApi {
  private http = inject(HttpClient);

  /**
   * `nliConfigured` comes back with the list because an empty list has more than one meaning, and the
   * view cannot tell them apart on its own — see the note on the server route.
   */
  listContradictions(status: 'open' | 'dismissed' | 'resolved' | 'all' = 'open', space?: string): Observable<{ contradictions: ContradictionRecord[]; nliConfigured: boolean }> {
    const params = new URLSearchParams({ status });
    if (space) params.set('space', space);
    return this.http.get<{ contradictions: ContradictionRecord[]; nliConfigured: boolean }>(`/api/contradictions?${params.toString()}`);
  }

  dismissContradiction(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`/api/contradictions/${encodeURIComponent(id)}/dismiss`, {});
  }

  reopenContradiction(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`/api/contradictions/${encodeURIComponent(id)}/reopen`, {});
  }

  /** Contradictions are never merged — this records HOW a human settled it. */
  resolveContradiction(id: string, resolution: 'edited' | 'linked'): Observable<{ status: string; resolution: string }> {
    return this.http.post<{ status: string; resolution: string }>(`/api/contradictions/${encodeURIComponent(id)}/resolve`, { resolution });
  }

  scanContradictions(space?: string): Observable<{ scannedSpaces: number; scanned: number; found: number; nliStalled: boolean }> {
    return this.http.post<{ scannedSpaces: number; scanned: number; found: number; nliStalled: boolean }>(
      `/api/contradictions/scan${space ? `?space=${encodeURIComponent(space)}` : ''}`, {});
  }
}
