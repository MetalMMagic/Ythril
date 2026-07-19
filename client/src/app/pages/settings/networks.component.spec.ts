/**
 * NetworksComponent — CHARACTERIZATION tests.
 *
 * The networks page is the largest settings component (~1261 lines) and shipped with ZERO coverage.
 * Before it can be safely refactored (splitting the Create/Join/Enable modals into child components,
 * folding onto the design system), these tests PIN its current observable behavior — the create/join
 * validation rules, the confirm-guarded destructive actions, and the API-call shapes — so a later
 * refactor that changes behavior fails here instead of shipping silently. They assert what the code
 * does today, not what it "should" do; a bug faithfully reproduced is still pinned.
 *
 * Style: drive the public methods directly and assert state via the public accessors/signals — the
 * component is created but never `detectChanges()`d, so the huge template is never rendered (keeps the
 * characterization about behavior, not markup, and avoids coupling to a layout that is about to change).
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import type { Network, VoteRound } from '../../core/api.types';
import { NetworksApi } from '../../core/networks-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { AdminApi } from '../../core/admin-api.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { NetworksComponent } from './networks.component';

const net = (over: Partial<Network> = {}): Network =>
  ({ id: 'n1', label: 'Braintree', type: 'closed', members: [], ...over } as Network);

const round = (over: Partial<VoteRound> = {}): VoteRound =>
  ({ id: 'r1', status: 'open', ...over } as VoteRound);

/** All NetworksApi methods the component touches, each a vi.fn() with a benign default. Override per test. */
function makeNetworksApi() {
  return {
    listNetworks: vi.fn(() => of({ networks: [] as Network[] })),
    listVotes: vi.fn(() => of({ rounds: [] as VoteRound[] })),
    createNetwork: vi.fn((body: unknown) => of(net({ id: 'new', label: (body as { label: string }).label }))),
    leaveNetwork: vi.fn(() => of({})),
    generateInvite: vi.fn(() => of({ handshakeId: 'h', inviteUrl: 'u', networkId: 'n1' })),
    updateNetworkSchedule: vi.fn(() => of({})),
    joinRemote: vi.fn(() => of({ status: 'joined', networkLabel: 'Braintree' })),
    removeMember: vi.fn(() => of({})),
    triggerSync: vi.fn(() => of({ ok: true })),
    getSyncHistory: vi.fn(() => of({ history: [] })),
    castVote: vi.fn(() => of({})),
    bootstrapLocalAgent: vi.fn(() => of({})),
    getLocalAgentStatus: vi.fn(() => of({})),
  } as any;
}

describe('NetworksComponent (characterization)', () => {
  let api: ReturnType<typeof makeNetworksApi>;
  let confirmResult: boolean;
  let confirm: ReturnType<typeof vi.fn>;
  let toastError: ReturnType<typeof vi.fn>;

  function make() {
    api = makeNetworksApi();
    confirmResult = true;
    confirm = vi.fn(() => Promise.resolve(confirmResult));
    toastError = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NetworksComponent, getTranslocoModule()],
      providers: [
        { provide: NetworksApi, useValue: api },
        { provide: SpacesApi, useValue: { listSpaces: () => of({ spaces: [] }) } },
        { provide: AdminApi, useValue: { getAbout: () => of({ publicUrl: '' }) } },
        { provide: ToastService, useValue: { error: toastError, success: vi.fn() } },
        { provide: ConfirmDialogService, useValue: { confirm } },
      ],
    });
    // Created but NOT detectChanges()'d — ngOnInit is driven explicitly per test.
    return TestBed.createComponent(NetworksComponent).componentInstance;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('load() populates networks and fetches only OPEN vote rounds per network', () => {
    const c = make();
    api.listNetworks.mockReturnValue(of({ networks: [net({ id: 'n1' }), net({ id: 'n2' })] }));
    api.listVotes.mockReturnValue(of({ rounds: [round({ id: 'open1', status: 'open' }), round({ id: 'closed1', status: 'closed' })] }));
    c.load();
    expect(c.networks().map(n => n.id)).toEqual(['n1', 'n2']);
    expect(api.listVotes).toHaveBeenCalledTimes(2); // one per network
    expect(c.openVotes('n1').map(r => r.id)).toEqual(['open1']); // closed round filtered out
  });

  it('createNetwork() is a no-op when the label is blank', () => {
    const c = make();
    c.form = { label: '   ', type: 'closed', votingDeadlineHours: 48 };
    c.createNetwork();
    expect(api.createNetwork).not.toHaveBeenCalled();
  });

  it('createNetwork() posts the selected spaces, appends the result, resets the form and closes the dialog', () => {
    const c = make();
    c.form = { label: ' Team ', type: 'club', votingDeadlineHours: 24 };
    c.networkSelectedSpaces = ['a', 'b'];
    c.showCreateDialog.set(true);
    c.createNetwork();
    expect(api.createNetwork).toHaveBeenCalledWith({ label: 'Team', type: 'club', spaces: ['a', 'b'], votingDeadlineHours: 24 });
    expect(c.networks().some(n => n.label === 'Team')).toBe(true);
    expect(c.showCreateDialog()).toBe(false);
    expect(c.form.label).toBe('');
    expect(c.networkSelectedSpaces).toEqual([]);
  });

  it('createNetwork() falls back to the comma-separated spaces field when the spaces list failed to load', () => {
    const c = make();
    c.spacesLoadFailed.set(true);
    c.form = { label: 'X', type: 'closed', votingDeadlineHours: 48 };
    c.networkSpacesFallback = 'general, personal ,';
    c.createNetwork();
    expect(api.createNetwork).toHaveBeenCalledWith(expect.objectContaining({ spaces: ['general', 'personal'] }));
  });

  it('createNetwork() surfaces the server error into createError', () => {
    const c = make();
    api.createNetwork.mockReturnValue(throwError(() => ({ error: { error: 'nope' } })));
    c.form = { label: 'X', type: 'closed', votingDeadlineHours: 48 };
    c.createNetwork();
    expect(c.createError()).toBe('nope');
    expect(c.creating()).toBe(false);
  });

  it('leaveNetwork() removes the network only after the confirm dialog is accepted', async () => {
    const c = make();
    c.networks.set([net({ id: 'n1' }), net({ id: 'n2' })]);
    confirmResult = false;
    await c.leaveNetwork(net({ id: 'n1' }));
    expect(api.leaveNetwork).not.toHaveBeenCalled();
    expect(c.networks().length).toBe(2);

    confirmResult = true;
    await c.leaveNetwork(net({ id: 'n1' }));
    expect(api.leaveNetwork).toHaveBeenCalledWith('n1');
    expect(c.networks().map(n => n.id)).toEqual(['n2']);
  });

  it('generateInvite() stores the returned bundle keyed by network id', () => {
    const bundle = { handshakeId: 'h', inviteUrl: 'u', networkId: 'n1' };
    api.generateInvite.mockReturnValue(of(bundle));
    const c = make();
    c.generateInvite('n1');
    expect(c.inviteBundle('n1')).toEqual(bundle);
  });

  it('saveSchedule() sends the per-network override and reflects it on success', () => {
    const c = make();
    c.networks.set([net({ id: 'n1' })]);
    c.netSchedule = { n1: '0 * * * *' };
    c.saveSchedule(net({ id: 'n1' }));
    expect(api.updateNetworkSchedule).toHaveBeenCalledWith('n1', '0 * * * *');
    expect(c.networks()[0].syncSchedule).toBe('0 * * * *');
  });

  it('joinNetwork() rejects invalid JSON, an incomplete bundle, and a missing "my URL" without calling the API', () => {
    const c = make();
    c.joinBundle = 'not json';
    c.joinNetwork();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();

    c.joinBundle = JSON.stringify({ handshakeId: 'h' }); // missing inviteUrl/rsaPublicKeyPem/networkId
    c.joinNetwork();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();

    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1' });
    c.joinMyUrl = '';
    c.joinNetwork();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();
  });

  it('joinNetwork() detects space-id collisions and holds for resolution instead of joining', () => {
    const c = make();
    c.availableSpaces.set([{ id: 'general', label: 'General' } as never]);
    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1', spaces: ['general', 'remote-only'] });
    c.joinMyUrl = 'https://me.example';
    c.joinNetwork();
    expect(c.joinCollisionSpaces()).toEqual(['general']);
    expect(api.joinRemote).not.toHaveBeenCalled();
  });

  it('joinNetwork() with no collisions joins immediately', () => {
    const c = make();
    c.availableSpaces.set([{ id: 'general', label: 'General' } as never]);
    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1', spaces: ['remote-only'] });
    c.joinMyUrl = 'https://me.example';
    c.joinNetwork();
    expect(api.joinRemote).toHaveBeenCalledWith(expect.objectContaining({ handshakeId: 'h', myUrl: 'https://me.example', networkId: 'n1' }));
  });

  it('sync() records the result on success and an {ok:false} result on error', () => {
    const c = make();
    api.triggerSync.mockReturnValue(of({ ok: true }));
    c.sync('n1');
    expect(c.syncResult('n1')).toEqual({ ok: true });

    api.triggerSync.mockReturnValue(throwError(() => ({})));
    c.sync('n2');
    expect(c.syncResult('n2')).toEqual({ ok: false });
  });

  it('castVote() reloads votes on success and toasts on error', () => {
    const c = make();
    c.castVote('n1', 'r1', 'yes');
    expect(api.castVote).toHaveBeenCalledWith('n1', 'r1', 'yes');
    expect(api.listVotes).toHaveBeenCalledWith('n1'); // reload

    api.castVote.mockReturnValue(throwError(() => ({ error: { error: 'boom' } })));
    c.castVote('n1', 'r1', 'veto');
    expect(toastError).toHaveBeenCalled();
  });

  it('removeMember() is confirm-guarded and reloads on success', async () => {
    const c = make();
    confirmResult = false;
    await c.removeMember(net({ id: 'n1' }), 'inst-2', 'Peer');
    expect(api.removeMember).not.toHaveBeenCalled();

    confirmResult = true;
    await c.removeMember(net({ id: 'n1' }), 'inst-2', 'Peer');
    expect(api.removeMember).toHaveBeenCalledWith('n1', 'inst-2');
    expect(api.listNetworks).toHaveBeenCalled(); // load() re-run
  });

  it('typeBadge() maps known network types and defaults to gray', () => {
    const c = make();
    expect(c.typeBadge('democratic')).toBe('badge-green');
    expect(c.typeBadge('braintree')).toBe('badge-purple');
    expect(c.typeBadge('unknown-type')).toBe('badge-gray');
  });

  it('toggleNetwork() expands then collapses a network by id', () => {
    const c = make();
    expect(c.expanded()).toBe('');
    c.toggleNetwork('n1');
    expect(c.expanded()).toBe('n1');
    c.toggleNetwork('n1');
    expect(c.expanded()).toBe('');
  });

  it('each async action flags in-flight while pending and clears it on completion', () => {
    const c = make();
    const gi = new Subject<any>(), ss = new Subject<any>(), sy = new Subject<any>(), cv = new Subject<any>();
    api.generateInvite.mockReturnValue(gi);
    api.updateNetworkSchedule.mockReturnValue(ss);
    api.triggerSync.mockReturnValue(sy);
    api.castVote.mockReturnValue(cv);
    c.networks.set([net({ id: 'n1' })]);

    c.generateInvite('n1');
    expect(c.generatingInvite['n1']).toBe(true);
    gi.next({ handshakeId: 'h', inviteUrl: 'u', networkId: 'n1' }); gi.complete();
    expect(c.generatingInvite['n1']).toBeUndefined();

    c.saveSchedule(net({ id: 'n1' }));
    expect(c.savingSchedule['n1']).toBe(true);
    ss.next({}); ss.complete();
    expect(c.savingSchedule['n1']).toBeUndefined();

    c.sync('n1');
    expect(c.syncingNet['n1']).toBe(true);
    sy.next({ ok: true }); sy.complete();
    expect(c.syncingNet['n1']).toBeUndefined();

    c.castVote('n1', 'r1', 'yes');
    expect(c.votingRound['r1']).toBe(true);
    cv.next({}); cv.complete();
    expect(c.votingRound['r1']).toBeUndefined();
  });

  it('an async action clears its in-flight flag on error too', () => {
    const c = make();
    const sy = new Subject<any>();
    api.triggerSync.mockReturnValue(sy);
    c.sync('n1');
    expect(c.syncingNet['n1']).toBe(true);
    sy.error({});
    expect(c.syncingNet['n1']).toBeUndefined();
  });
});
