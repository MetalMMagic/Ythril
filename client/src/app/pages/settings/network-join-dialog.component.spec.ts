/**
 * NetworkJoinDialogComponent — characterization tests for the join flow, relocated from
 * networks.component.spec.ts when the Join dialog was extracted into its own child component (PR-U3).
 * Pins the bundle validation (invalid JSON / incomplete bundle / missing my-URL), the space-id
 * collision detection + hold-for-resolution, the alias validation in confirmJoin, and the immediate
 * join path. `myUrl` is a one-way input from the host; success emits `joined`.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { NetworksApi } from '../../core/networks-api.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { NetworkJoinDialogComponent } from './network-join-dialog.component';

describe('NetworkJoinDialogComponent (characterization)', () => {
  let api: { joinRemote: ReturnType<typeof vi.fn> };

  function make(myUrl = 'https://me.example') {
    api = { joinRemote: vi.fn(() => of({ status: 'joined', networkLabel: 'X' })) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NetworkJoinDialogComponent, getTranslocoModule()],
      providers: [{ provide: NetworksApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(NetworkJoinDialogComponent);
    fixture.componentRef.setInput('myUrl', myUrl);
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('rejects invalid JSON, an incomplete bundle, and a missing "my URL" without calling the API', () => {
    let c = make().componentInstance;
    c.joinBundle = 'not json';
    c.joinNetwork();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();

    c.joinBundle = JSON.stringify({ handshakeId: 'h' }); // missing inviteUrl/rsaPublicKeyPem/networkId
    c.joinNetwork();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();

    c = make('').componentInstance; // no my-URL
    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1' });
    c.joinNetwork();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();
  });

  it('detects space-id collisions and holds for resolution instead of joining', () => {
    const f = make();
    f.componentRef.setInput('availableSpaces', [{ id: 'general', label: 'General' }] as never);
    const c = f.componentInstance;
    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1', spaces: ['general', 'remote-only'] });
    c.joinNetwork();
    expect(c.joinCollisionSpaces()).toEqual(['general']);
    expect(api.joinRemote).not.toHaveBeenCalled();
  });

  it('with no collisions joins immediately and emits "joined" on success', () => {
    const f = make();
    f.componentRef.setInput('availableSpaces', [{ id: 'general', label: 'General' }] as never);
    const c = f.componentInstance;
    const joined = vi.fn();
    c.joined.subscribe(joined);
    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1', spaces: ['remote-only'] });
    c.joinNetwork();
    expect(api.joinRemote).toHaveBeenCalledWith(expect.objectContaining({ handshakeId: 'h', myUrl: 'https://me.example', networkId: 'n1' }));
    expect(joined).toHaveBeenCalled();
  });

  it('confirmJoin() validates alias inputs, then joins with a spaceMap', () => {
    const f = make();
    f.componentRef.setInput('availableSpaces', [{ id: 'general' }] as never);
    const c = f.componentInstance;
    c.joinBundle = JSON.stringify({ handshakeId: 'h', inviteUrl: 'u', rsaPublicKeyPem: 'k', networkId: 'n1', spaces: ['general'] });
    c.joinNetwork(); // → collision, holds
    expect(c.joinCollisionSpaces()).toEqual(['general']);

    c.onCollisionActionChange('general', 'alias');
    c.joinSpaceAliases['general'] = ''; // blank alias → error, no join
    c.confirmJoin();
    expect(c.joinError()).toBeTruthy();
    expect(api.joinRemote).not.toHaveBeenCalled();

    c.joinSpaceAliases['general'] = 'general-local'; // valid alias → joins with spaceMap
    c.confirmJoin();
    expect(api.joinRemote).toHaveBeenCalledWith(expect.objectContaining({ spaceMap: { general: 'general-local' } }));
  });
});
