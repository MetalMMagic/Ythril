/**
 * NetworkInvitePanelComponent — the invite half of a network card, extracted from
 * `networks.component.ts` when `F-18` gave it three more facts than it had room for.
 *
 * The two generate cases moved here with the code they exercise, rather than being deleted: a
 * characterization test that disappears in a refactor is the refactor asserting itself.
 *
 * What is new is the ONE-LINE code — the panel shows and copies `inviteCode` when the instance produced
 * one, and falls back to the JSON bundle when it did not, because an instance that has not been upgraded
 * answers without a code and a copy button that copied nothing would be the worst outcome of the three.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, Subject } from 'rxjs';
import { NetworksApi } from '../../core/networks-api.service';
import { ToastService } from '../../core/toast.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { NetworkInvitePanelComponent } from './network-invite-panel.component';

describe('NetworkInvitePanelComponent', () => {
  let api: { generateInvite: ReturnType<typeof vi.fn> };
  let toast: { error: ReturnType<typeof vi.fn> };

  function make(networkId = 'n1') {
    api = { generateInvite: vi.fn(() => of({})) };
    toast = { error: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NetworkInvitePanelComponent, getTranslocoModule()],
      providers: [
        { provide: NetworksApi, useValue: api },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(NetworkInvitePanelComponent);
    fixture.componentRef.setInput('networkId', networkId);
    return fixture.componentInstance;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('generate() stores the returned bundle', () => {
    // `make()` first: it is what builds `api`, so mocking before it would set a stub on the previous
    // test's double — or on nothing at all, in the first case to run.
    const c = make();
    const bundle = { handshakeId: 'h', inviteUrl: 'u', networkId: 'n1' };
    api.generateInvite.mockReturnValue(of(bundle));
    c.generate();
    expect(api.generateInvite).toHaveBeenCalledWith('n1');
    expect(c.bundle()).toEqual(bundle);
  });

  it('holds a pending flag while the request is in flight, and clears it on both outcomes', () => {
    const c = make();
    const gi = new Subject<never>();
    api.generateInvite.mockReturnValue(gi);
    c.generate();
    expect(c.generating()).toBe(true);
    gi.error({ error: { error: 'nope' } });
    expect(c.generating()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });

  it('shows and copies the ONE-LINE code when the instance produced one', () => {
    const c = make();
    c.bundle.set({ handshakeId: 'h', inviteUrl: 'u', networkId: 'n1', rsaPublicKeyPem: 'k',
      inviteCode: 'ythril1_AAAA' } as never);
    expect(c.inviteText(c.bundle()!)).toBe('ythril1_AAAA');
  });

  it('falls back to the JSON bundle when the instance is older than the code', () => {
    // Not decoration: a copy button that silently copied nothing is worse than either shape.
    const c = make();
    const bundle = { handshakeId: 'h', inviteUrl: 'u', networkId: 'n1', rsaPublicKeyPem: 'k' };
    c.bundle.set(bundle as never);
    expect(c.inviteText(c.bundle()!)).toContain('handshakeId');
  });
});
