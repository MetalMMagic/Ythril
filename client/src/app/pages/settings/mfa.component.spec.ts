/**
 * MfaComponent — characterization test for the enrolment QR (A20).
 *
 * Pins the behaviour that must survive swapping the QR library (CommonJS `qrcode` → ESM `uqr`):
 * after `startEnroll()`, `qrUrl` holds a non-empty `data:image/…` URL that the template's `<img>`
 * can render, and the component moves to the `enrolling` state. The assertion deliberately checks
 * the `data:image/` prefix (true for both the old PNG data-URL and the new SVG data-URL) rather than
 * the exact MIME, so it characterizes the observable contract — "enrolment yields a renderable QR
 * image" — not the implementation. Proven green against the original `qrcode` impl before the swap.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthApi } from '../../core/auth-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { MfaComponent } from './mfa.component';

/** Minimal AuthApi stub: the component calls getMfaStatus (ngOnInit) and setupMfa (startEnroll). */
function makeAuthApi() {
  return {
    getMfaStatus: () => of({ enabled: false }),
    setupMfa: () => of({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauth: 'otpauth://totp/Ythril:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Ythril',
    }),
  } as any;
}

describe('MfaComponent — enrolment QR (characterization)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MfaComponent, getTranslocoModule()],
      providers: [{ provide: AuthApi, useFactory: makeAuthApi }],
    });
  });

  it('startEnroll populates qrUrl with a renderable data:image URL and enters the enrolling state', async () => {
    const fixture = TestBed.createComponent(MfaComponent);
    const cmp = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit → refresh()

    cmp.startEnroll();

    expect(cmp.state()).toBe('enrolling');
    expect(cmp.secret()).toBe('JBSWY3DPEHPK3PXP');
    // QR generation may resolve on a microtask (qrcode) or synchronously (uqr).
    await vi.waitFor(() => expect(cmp.qrUrl()).not.toBe(''));
    const url = cmp.qrUrl();
    expect(url.startsWith('data:image/')).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });
});
