/**
 * TokensComponent — focused tests for the U6 permission work.
 *
 * The component shipped with no spec. PR-U6 adds a live capability description under the permission
 * radios at create time. These pin (a) the permission → create-payload mapping the feature sits on top of
 * (characterization — unchanged by U6), and (b) the new description tracking the selected level.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { TokensComponent } from './tokens.component';
import { AuthApi } from '../../core/auth-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

function make(createSpy = vi.fn().mockReturnValue(of({ token: 'tok_x' }))) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TokensComponent, getTranslocoModule()],
    providers: [
      { provide: AuthApi, useValue: {
        getMe: () => of({ admin: true }),
        listTokens: () => of({ tokens: [] }),
        createToken: createSpy,
      } },
      { provide: SpacesApi, useValue: { listSpaces: () => of({ spaces: [] }) } },
      { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TokensComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, createSpy };
}

describe('TokensComponent — permission → create payload', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('read-only sends readOnly:true; standard sends neither flag; admin sends admin:true', () => {
    const cases = [
      { perm: 'readOnly', admin: undefined, readOnly: true },
      { perm: 'standard', admin: undefined, readOnly: undefined },
      { perm: 'admin',    admin: true,      readOnly: undefined },
    ] as const;
    for (const { perm, admin, readOnly } of cases) {
      const { c, createSpy } = make();
      c.newName = 'ci-token';
      c.newPermission = perm;
      c.createToken();
      const body = createSpy.mock.calls[0][0];
      expect(body.name).toBe('ci-token');
      expect(body.admin).toBe(admin);
      expect(body.readOnly).toBe(readOnly);
    }
  });
});

describe('TokensComponent — permission pill colour semantics (UI-BUNDLE-1)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  // Owner feedback 2026-07-23: admin=red, standard=green, read-only=yellow. The list pills map to the
  // design-system StatusPill variants error / ok / warn respectively (schema-library stays pending/blue).
  it('renders the permission pill with the level-coded StatusPill variant', () => {
    const cases = [
      { tok: { id: 't1', admin: true }, variant: 'error' },
      { tok: { id: 't2' }, variant: 'ok' }, // standard = no flags
      { tok: { id: 't3', readOnly: true }, variant: 'warn' },
      { tok: { id: 't4', schemaLibrary: true }, variant: 'pending' },
    ] as const;
    for (const { tok, variant } of cases) {
      const { fixture, c } = make();
      c.tokens.set([{ spaces: [], ...tok } as never]);
      fixture.detectChanges();
      const pill = fixture.nativeElement.querySelector('tbody tr td:nth-child(2) .pill');
      expect(pill, `token ${tok.id}`).not.toBeNull();
      expect(pill.classList.contains(variant), `token ${tok.id} → ${variant}`).toBe(true);
    }
  });
});

describe('TokensComponent — permission capability help (U6)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  // A capability-help line renders under the radios in the open create dialog. Its key is built as
  // `tokens.permission.<level>.desc`, so it tracks the selected level (live text verified via Playwright;
  // the transloco pipe's async key resolution is awkward to pin deterministically in a unit test).
  it('renders the permission capability-help line in the open create dialog', () => {
    const { fixture } = make();
    fixture.componentInstance.showCreateDialog.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.permission-help')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.permission-help > span')).not.toBeNull();
  });
});

/**
 * CHARACTERIZATION, written before extracting the create dialog into its own component (Q-5).
 *
 * The file crossed the god-file ceiling at 676 lines and is frozen; the dialog alone is over half of it and
 * comes out next. These pin what the dialog DOES today — proven against the current code — so the extraction
 * can be judged by whether they still pass rather than by reading the diff.
 *
 * They deliberately assert the request BODY rather than the DOM. The body is the contract with the server,
 * it is what the mint cap and the audit log see, and it is the thing that must survive a refactor unchanged;
 * markup is what the refactor is allowed to move.
 */
describe('TokensComponent — create payload, characterized before the Q-5 extraction', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('sends only the name when nothing else is chosen', () => {
    const { c, createSpy } = make();
    c.newName = '  spaced  ';
    c.createToken();
    expect(createSpy.mock.calls[0][0]).toEqual({ name: 'spaced' });
  });

  it('refuses to fire at all on an empty name', () => {
    const { c, createSpy } = make();
    c.newName = '   ';
    c.createToken();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('omits mfa when it is `inherit`, because absent IS inherit on the server', () => {
    const { c, createSpy } = make();
    c.newName = 't'; c.newMfa = 'inherit';
    c.createToken();
    expect('mfa' in createSpy.mock.calls[0][0]).toBe(false);
    const second = make();
    second.c.newName = 't'; second.c.newMfa = 'exempt';
    second.c.createToken();
    expect(second.createSpy.mock.calls[0][0].mfa).toBe('exempt');
  });

  it('sends spaces only when some are selected', () => {
    const { c, createSpy } = make();
    c.newName = 't';
    c.newSelectedSpaces = new Set(['qa', 'research']);
    c.createToken();
    expect(createSpy.mock.calls[0][0].spaces.sort()).toEqual(['qa', 'research']);
    const none = make();
    none.c.newName = 't';
    none.c.createToken();
    expect('spaces' in none.createSpy.mock.calls[0][0]).toBe(false);
  });

  it('with the matrix on, sends `rights` and NONE of the legacy fields', () => {
    // The mutual exclusion is the part most likely to be lost in an extraction: the server refuses a body
    // carrying both, so a refactor that leaves the permission radio wired would turn every matrix create
    // into a 400.
    const { c, createSpy } = make();
    c.newName = 't';
    c.newPermission = 'admin';
    c.newSelectedSpaces = new Set(['qa']);
    c.useMatrix.set(true);
    c.draftRights.set({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: { qa: { knowledge: 'read', files: 'none', schema: 'none', dataQuality: 'none' } } });
    c.createToken();
    const body = createSpy.mock.calls[0][0];
    expect(body.rights.perSpace.qa.knowledge).toBe('read');
    expect('admin' in body).toBe(false);
    expect('readOnly' in body).toBe(false);
    expect('spaces' in body).toBe(false);
  });

  it('with the matrix OFF, never sends `rights` — even if a draft was edited first', () => {
    // Someone can open the matrix, edit it, change their mind and close it. The draft survives in memory,
    // and sending it anyway would be the same mutual-exclusion 400 from the other direction.
    const { c, createSpy } = make();
    c.newName = 't';
    c.draftRights.set({ instanceAdmin: true, createSpaces: false, floor: null, perSpace: {} });
    c.useMatrix.set(false);
    c.createToken();
    expect('rights' in createSpy.mock.calls[0][0]).toBe(false);
  });
});
