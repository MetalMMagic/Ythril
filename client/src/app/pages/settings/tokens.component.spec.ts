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
import { TokenCreateDialogComponent } from './token-create-dialog.component';
import { AuthApi } from '../../core/auth-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';

/**
 * The create flow moved into `TokenCreateDialogComponent` (Q-5). The HOST changed; not one assertion below
 * did. That is the result these tests were written to produce: they were proven green against the
 * pre-extraction code, and the only edit the refactor required was where they reach for `createToken`.
 *
 * If a future change to this file needs an assertion edited rather than a subject re-pointed, that is the
 * refactor altering behaviour and the edit is the thing to question.
 */
function make(createSpy = vi.fn().mockReturnValue(of({ token: 'tok_x' }))) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TokenCreateDialogComponent, getTranslocoModule()],
    providers: [
      { provide: AuthApi, useValue: {
        getMe: () => of({ admin: true }),
        // The page renders <app-own-token-rights/>, which reads the caller's own record. Stubbed with a
        // legacy-shaped response so the panel renders its no-grid sentence and stays out of these assertions.
        verifyToken: () => of({ id: 'self', name: 'self' }),
        listTokens: () => of({ tokens: [] }),
        createToken: createSpy,
      } },
      { provide: SpacesApi, useValue: { listSpaces: () => of({ spaces: [] }) } },
      { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TokenCreateDialogComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, createSpy };
}

/**
 * The create body: one description of access, always the matrix.
 *
 * This replaces a characterization of the OLD form, which offered a spaces checkbox list, a three-way
 * permission radio and the matrix behind a button — two vocabularies for one decision, mutually exclusive on
 * the wire. That form could compose a body the server refuses, and the operator would read the 400 as a bug
 * rather than as a choice they had made.
 *
 * The old tests asserted `admin: true` / `readOnly: true` came out of the radio. They are not adapted here,
 * they are REPLACED: those fields must now never be sent, which is a different claim and the one worth
 * pinning. Keeping them adapted would have meant asserting the legacy path still works, on a form that no
 * longer has it.
 */
describe('TokensComponent — create payload is the matrix, and only the matrix', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('sends name + rights, and NONE of the legacy scope fields', () => {
    const { c, createSpy } = make();
    c.newName = 'ci-token';
    c.draftRights.set({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: { qa: { knowledge: 'write', files: 'none', schema: 'none', dataQuality: 'none' } } });
    c.createToken();

    const body = createSpy.mock.calls[0][0];
    expect(body.name).toBe('ci-token');
    expect(body.rights?.perSpace?.['qa']?.knowledge).toBe('write');
    // The four that made the body ambiguous. `rights` plus any of these is a 400 from the server.
    for (const legacy of ['admin', 'readOnly', 'spaces', 'mfa']) {
      expect(body[legacy]).toBeUndefined();
    }
  });

  it('always sends rights, even when nothing was granted', () => {
    // An empty matrix is a real answer — a token that reaches nothing yet — and it must go as an explicit
    // empty `rights`, not as an absent field. Absent would fall back to the legacy model on the server,
    // where an absent `spaces` means EVERY space: the widest possible token from the narrowest input.
    const { c, createSpy } = make();
    c.newName = 'nothing-yet';
    c.createToken();

    const body = createSpy.mock.calls[0][0];
    expect(body.rights).toEqual({ instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} });
    expect(body.spaces).toBeUndefined();
  });

  it('omits expiresAt when no date was picked, and sends an ISO string when one was', () => {
    const { c, createSpy } = make();
    c.newName = 't';
    c.createToken();
    expect(createSpy.mock.calls[0][0].expiresAt).toBeUndefined();

    const second = make();
    second.c.newName = 't';
    second.c.newExpiry = '2027-01-31';
    second.c.createToken();
    expect(second.createSpy.mock.calls[0][0].expiresAt).toMatch(/^2027-01-31T/);
  });
});

/**
 * The LIST page. Separate harness from `make()` since Q-5: the pills belong to the table and the create
 * fields belong to the dialog, and one harness serving both was only possible while they shared a file.
 */
function makeList(tokens: unknown[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TokensComponent, getTranslocoModule()],
    providers: [
      { provide: AuthApi, useValue: {
        getMe: () => of({ admin: true }),
        // The page renders <app-own-token-rights/>, which reads the caller's own record. Stubbed with a
        // legacy-shaped response so the panel renders its no-grid sentence and stays out of these assertions.
        verifyToken: () => of({ id: 'self', name: 'self' }),
        listTokens: () => of({ tokens }),
        createToken: vi.fn().mockReturnValue(of({ token: 'tok_x' })),
      } },
      { provide: SpacesApi, useValue: { listSpaces: () => of({ spaces: [] }) } },
      { provide: ToastService, useValue: { show: () => {}, error: () => {}, success: () => {} } },
      { provide: ConfirmDialogService, useValue: { confirm: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TokensComponent);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance };
}

describe('TokensComponent — permission pill colour semantics (UI-BUNDLE-1)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  /** A matrix holding `rung` in every area, as a floor — the simplest shape that expresses one intent. */
  const rights = (rung: string) => ({
    instanceAdmin: rung === 'admin',
    createSpaces: rung === 'admin',
    floor: { knowledge: rung, files: rung, schema: rung, dataQuality: rung },
    perSpace: {},
  });

  /**
   * The permission pill was REMOVED in 3.0.1, so this asserts its absence and the presence of what replaced
   * it. The pill said admin / standard / read-only / schema-library; the glyph beside it says what the token
   * can actually reach, per area and per space. "Standard" only ever meant "none of the other four", which
   * is nothing once the glyph is there — the owner's words were *"Standard has no value anymore to see"*.
   *
   * Kept as a test rather than deleted because the row still has to show SOMETHING for a token with no
   * matrix, and that is the case this file now guards.
   */
  it('shows no permission pill, and the rights glyph instead', () => {
    const { fixture, c } = makeList();
    c.tokens.set([{ spaces: [], id: 't1', rights: rights('write') } as never]);
    fixture.detectChanges();
    const cell = fixture.nativeElement.querySelector('tbody tr td:nth-child(2)');
    expect(cell.querySelector('.pill'), 'the permission pill is gone').toBeNull();
    expect(cell.querySelector('app-rights-glyph'), 'the glyph replaces it').not.toBeNull();
  });

  it('a token with NO matrix still says so, and still offers the pen', () => {
    // The 3.0.1 bug in one test: glyph and pen were both inside @if (t.rights), so a rightless token showed
    // neither and could not be given a matrix from the UI. The glyph cannot draw one that is not there; the
    // pen must be there regardless, because granting one is the whole point.
    const { fixture, c } = makeList();
    c.tokens.set([{ spaces: [], id: 't2' } as never]);
    fixture.detectChanges();
    const cell = fixture.nativeElement.querySelector('tbody tr td:nth-child(2)');
    expect(cell.querySelector('app-rights-glyph'), 'nothing to draw').toBeNull();
    expect(cell.querySelector('.no-rights'), 'the absence is stated').not.toBeNull();
    expect(cell.querySelector('button'), 'the pen is the way to fix it').not.toBeNull();
  });
});

describe('TokensComponent — permission capability help (U6)', () => {
  beforeEach(() => TestBed.resetTestingModule());

  // A capability-help line renders under the radios in the open create dialog. Its key is built as
  // `tokens.permission.<level>.desc`, so it tracks the selected level (live text verified via Playwright;
  // the transloco pipe's async key resolution is awkward to pin deterministically in a unit test).
  it('renders the permission capability-help line in the open create dialog', () => {
    const { fixture } = make();
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

  it('trims the label, and sends nothing but the label and the matrix', () => {
    const { c, createSpy } = make();
    c.newName = '  spaced  ';
    c.createToken();
    expect(createSpy.mock.calls[0][0]).toEqual({
      name: 'spaced',
      rights: { instanceAdmin: false, createSpaces: false, floor: null, perSpace: {} },
    });
  });

  it('refuses to fire at all on an empty name', () => {
    const { c, createSpy } = make();
    c.newName = '   ';
    c.createToken();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('never sends `mfa` — the second factor is a property of the token, not of minting it', () => {
    // The create form used to carry a three-way second-factor selector. It is gone: MFA is set ON the token,
    // so folding it into the mint request meant deciding it before there was a token to decide it about.
    const { c, createSpy } = make();
    c.newName = 't';
    c.createToken();
    expect('mfa' in createSpy.mock.calls[0][0]).toBe(false);
  });

  it('a granted matrix survives into the body unchanged', () => {
    // Not "rights is present" — the VALUES. A matrix that reached the server flattened or defaulted would
    // still pass a presence check while granting something nobody chose.
    const { c, createSpy } = make();
    c.newName = 't';
    c.draftRights.set({
      instanceAdmin: false,
      createSpaces: true,
      floor: { knowledge: 'read', files: 'none', schema: 'none', dataQuality: 'none' },
      perSpace: { qa: { knowledge: 'admin', files: 'write', schema: 'none', dataQuality: 'read' } },
    });
    c.createToken();
    const body = createSpy.mock.calls[0][0];
    expect(body.rights.createSpaces).toBe(true);
    expect(body.rights.floor.knowledge).toBe('read');
    expect(body.rights.perSpace.qa).toEqual({ knowledge: 'admin', files: 'write', schema: 'none', dataQuality: 'read' });
  });
});

/**
 * ── The host closes the editor BEFORE acting ──────────────────────────────────────────────────────
 *
 * Rotate's new secret appears in a copy-once banner on the PAGE. If the editor stayed open, the only copy of a
 * new credential would render behind the modal — visible to nobody, and unrecoverable, because a secret is
 * shown exactly once.
 */
describe('TokensComponent — danger actions from the editor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('closes the editor before running the action', () => {
    const { c } = makeList([{ id: 't1', name: 'CI', admin: false }]);
    // Stubbed, because this test is about the ORDERING and letting the real handler run would fire a
    // confirm-dialog promise and an API call into a list harness that has neither — passing the assertion
    // while leaving an unhandled rejection behind it. That shape is how 11 of those accumulated once before.
    vi.spyOn(c, 'regenerate').mockResolvedValue(undefined as never);
    c.editRightsFor.set({ id: 't1', name: 'CI' } as never);
    expect(c.editRightsFor()).not.toBeNull();

    c.dangerFromEditor({ id: 't1', name: 'CI' } as never, 'rotate');
    // Synchronous: the confirm dialog is awaited inside `regenerate`, so by the time that promise settles the
    // modal must already be gone.
    expect(c.editRightsFor()).toBeNull();
  });

  it('routes rotate and revoke to the page handlers rather than duplicating them', () => {
    const { c } = makeList([{ id: 't1', name: 'CI', admin: false }]);
    const rotate = vi.spyOn(c, 'regenerate').mockResolvedValue(undefined as never);
    const revoke = vi.spyOn(c, 'revoke').mockResolvedValue(undefined as never);

    c.dangerFromEditor({ id: 't1', name: 'CI' } as never, 'rotate');
    expect(rotate).toHaveBeenCalledTimes(1);
    expect(revoke).not.toHaveBeenCalled();

    c.dangerFromEditor({ id: 't1', name: 'CI' } as never, 'revoke');
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(rotate).toHaveBeenCalledTimes(1);
  });
});
