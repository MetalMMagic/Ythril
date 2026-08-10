import type { TokenRights } from '../pages/settings/rights-glyph.component';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { TokenRecord } from './api.types';

/** Auth, first-run setup, personal access tokens, and MFA. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private http = inject(HttpClient);

  // ── Auth ──────────────────────────────────────────────────────────────────

  /** Verify the supplied PAT is valid and return its metadata */
  verifyToken(): Observable<{ id: string; name: string; spaces?: string[] }> {
    return this.http.get<any>('/api/tokens/me');
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  getSetupStatus(): Observable<{ configured: boolean }> {
    return this.http.get<{ configured: boolean }>('/api/setup/status');
  }

  completeSetup(body: {
    code: string;
    label: string;
    settingsPassword: string;
  }): Observable<{ plaintext: string }> {
    return this.http.post<{ plaintext: string }>('/api/setup', body);
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  getMe(): Observable<TokenRecord> {
    return this.http.get<TokenRecord>('/api/tokens/me');
  }

  listTokens(): Observable<{ tokens: TokenRecord[] }> {
    return this.http.get<{ tokens: TokenRecord[] }>('/api/tokens');
  }

  createToken(body: { name: string; expiresAt?: string; spaces?: string[]; admin?: boolean; readOnly?: boolean; schemaLibrary?: boolean; mfa?: 'exempt' | 'required' }): Observable<{ token: TokenRecord; plaintext: string }> {
    return this.http.post<{ token: TokenRecord; plaintext: string }>('/api/tokens', body);
  }

  regenerateToken(id: string): Observable<{ plaintext: string }> {
    return this.http.post<{ plaintext: string }>(`/api/tokens/${id}/regenerate`, {});
  }

  /**
   * Replace a token's rights matrix.
   *
   * Separate call from `renameToken` rather than one method with two optional fields: the server guards them
   * differently — a rights edit is capped at the caller's own and refused outright if it would raise the
   * caller's floor — and a single method would let a caller believe it renamed while it changed permissions.
   */
  setTokenRights(id: string, rights: TokenRights): Observable<{ token: TokenRecord }> {
    return this.http.patch<{ token: TokenRecord }>(`/api/tokens/${id}`, { rights });
  }

  renameToken(id: string, name: string): Observable<{ token: TokenRecord }> {
    return this.http.patch<{ token: TokenRecord }>(`/api/tokens/${id}`, { name });
  }

  revokeToken(id: string): Observable<void> {
    return this.http.delete<void>(`/api/tokens/${id}`);
  }

  // ── MFA ───────────────────────────────────────────────────────────────────

  getMfaStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>('/api/mfa/status');
  }

  setupMfa(): Observable<{ secret: string; otpauth: string }> {
    return this.http.post<{ secret: string; otpauth: string }>('/api/mfa/setup', {});
  }

  verifyMfaCode(code: string): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>('/api/mfa/verify', { code });
  }

  disableMfa(): Observable<void> {
    return this.http.delete<void>('/api/mfa');
  }
}
