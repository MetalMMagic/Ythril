/**
 * The second factor, edited on the token — and the code field that granting an exemption needs.
 *
 * ## What this is about
 *
 * `mfa` used to be settable only while minting, so changing a scheduler's exemption meant revoking the token
 * and minting a replacement — rotating a secret to change a flag. It is a property of the token, so it is
 * edited on the token.
 *
 * The part worth testing is not that a dropdown exists. It is the three decisions around it:
 *
 *  1. **An absent `mfa` IS `inherit`.** Every token minted before this reads as `inherit`, and if the two
 *     spellings did not land on the same option, opening any existing token's editor and pressing Save would
 *     send `mfa: 'inherit'` as a *change* — writing an audit entry for an edit nobody made.
 *  2. **Each field goes only when it changed.** Same reason, and for the second factor it matters most: that
 *     audit entry is what someone will read one day to find out when an exemption was granted.
 *  3. **The code field appears when GRANTING**, not whenever a token is exempt. Asking for a code to edit the
 *     label of an already-exempt token is a prompt for a secret that changes nothing.
 *
 * Run: npx vitest run src/app/pages/settings/token-editor-mfa.spec.ts
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthApi } from '../../core/auth-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { TokenRightsDialogComponent } from './token-rights-dialog.component';

const RIGHTS = { instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} };

function make(token: Record<string, unknown>) {
  const updateSpy = vi.fn().mockReturnValue(of({ token: { ...token, name: 'saved' } }));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TokenRightsDialogComponent, getTranslocoModule()],
    providers: [{ provide: AuthApi, useValue: { updateToken: updateSpy } as any }],
  });
  const fixture = TestBed.createComponent(TokenRightsDialogComponent);
  fixture.componentRef.setInput('token', { id: 't1', name: 'CI', rights: RIGHTS, ...token });
  fixture.componentRef.setInput('availableSpaces', [{ id: 'qa', label: 'QA' }]);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance as any, updateSpy };
}

describe('the token editor: second factor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('an ABSENT mfa opens as `inherit`', () => {
    // The whole pre-existing fleet has no `mfa` field. If this landed on '' or undefined, the select would
    // show nothing and a save would look like a change.
    expect(make({}).c.draftMfa).toBe('inherit');
  });

  it('a stored value opens as itself', () => {
    expect(make({ mfa: 'exempt' }).c.draftMfa).toBe('exempt');
    expect(make({ mfa: 'required' }).c.draftMfa).toBe('required');
  });

  it('saving without touching it does NOT send mfa', () => {
    // The audit entry for an exemption is the one someone will read to find out when it was granted. A save
    // that always sent the field would put an entry there for every unrelated edit.
    const { c, updateSpy } = make({ mfa: 'exempt' });
    c.save();
    expect('mfa' in updateSpy.mock.calls[0][1]).toBe(false);
  });

  it('an absent-to-inherit save does not count as a change either', () => {
    // The asymmetric case: stored is absent, the select says `inherit`. Comparing the raw values would see
    // undefined !== 'inherit' and send it.
    const { c, updateSpy } = make({});
    c.save();
    expect('mfa' in updateSpy.mock.calls[0][1]).toBe(false);
  });

  it('changing it sends exactly the new value', () => {
    const { c, updateSpy } = make({});
    c.draftMfa = 'required';
    c.save();
    expect(updateSpy.mock.calls[0][1].mfa).toBe('required');
  });

  it('the code field appears only when GRANTING an exemption', () => {
    const fresh = make({});
    expect(fresh.c.needsCode()).toBe(false);
    fresh.c.draftMfa = 'exempt';
    expect(fresh.c.needsCode()).toBe(true);

    // Already exempt and editing something else: no code, because nothing is being granted.
    const already = make({ mfa: 'exempt' });
    expect(already.c.needsCode()).toBe(false);

    // Moving AWAY from an exemption is a narrowing and needs nothing.
    already.c.draftMfa = 'inherit';
    expect(already.c.needsCode()).toBe(false);
  });

  it('the code travels as an argument, not in the body', () => {
    // It is a header on the request. Putting a secret in the PATCH body would land it in any request log that
    // records bodies, and the server does not read it there.
    const { c, updateSpy } = make({});
    c.draftMfa = 'exempt';
    c.totpCode = ' 123456 ';
    c.save();
    expect(updateSpy.mock.calls[0][2]).toBe('123456');
    expect('totpCode' in updateSpy.mock.calls[0][1]).toBe(false);
  });

  it('an empty code is sent as undefined, not as an empty string', () => {
    // An empty header turns the server's "you need a code" into "your code is wrong".
    const { c, updateSpy } = make({});
    c.save();
    expect(updateSpy.mock.calls[0][2]).toBeUndefined();
  });

  it('surfaces the server MESSAGE for a refused exemption, not the bare code', () => {
    // The 403 body is `{ error: 'MFA_REQUIRED', message: '...requires a current TOTP code...' }`. Showing
    // `error` reads as "you are not allowed"; the message is the half that says what to do.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TokenRightsDialogComponent, getTranslocoModule()],
      providers: [{ provide: AuthApi, useValue: {
        updateToken: () => throwError(() => ({ error: { error: 'MFA_REQUIRED', message: 'needs a current TOTP code' } })),
      } as any }],
    });
    const f = TestBed.createComponent(TokenRightsDialogComponent);
    f.componentRef.setInput('token', { id: 't1', name: 'CI', rights: RIGHTS });
    f.componentRef.setInput('availableSpaces', []);
    f.detectChanges();
    const c = f.componentInstance as any;
    c.draftMfa = 'exempt';
    c.save();
    expect(c.error()).toBe('needs a current TOTP code');
    expect(c.saving()).toBe(false);
  });
});
