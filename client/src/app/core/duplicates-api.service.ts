import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { DuplicateRecord } from './api.types';

/** Near-duplicate brain-record candidates: list, dismiss, re-rate, merge, and rescan. */
@Injectable({ providedIn: 'root' })
export class DuplicatesApi {
  private http = inject(HttpClient);

  listDuplicates(status: 'open' | 'dismissed' | 'all' = 'open', space?: string): Observable<{ duplicates: DuplicateRecord[] }> {
    const params = new URLSearchParams({ status });
    if (space) params.set('space', space);
    return this.http.get<{ duplicates: DuplicateRecord[] }>(`/api/duplicates?${params.toString()}`);
  }

  dismissDuplicate(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`/api/duplicates/${encodeURIComponent(id)}/dismiss`, {});
  }

  /** Re-rate a dismissed pair back onto the open review list (the counterpart to dismiss). */
  reopenDuplicate(id: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`/api/duplicates/${encodeURIComponent(id)}/reopen`, {});
  }

  mergeDuplicate(id: string): Observable<{ status: string; survivorId?: string }> {
    return this.http.post<{ status: string; survivorId?: string }>(`/api/duplicates/${encodeURIComponent(id)}/merge`, {});
  }

  scanDuplicates(space?: string): Observable<{ scannedSpaces: number; scanned: number; pairs: number }> {
    return this.http.post<{ scannedSpaces: number; scanned: number; pairs: number }>(`/api/duplicates/scan${space ? `?space=${encodeURIComponent(space)}` : ''}`, {});
  }
}
