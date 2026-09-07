/**
 * A save the server refused has to say what it said.
 *
 * ## The report (`Q-13`)
 *
 * Canary, against 4.0.0: selecting the `repair` extraction mode left the save button inert with no message.
 * The API answers refusals with a reason and the page discarded it — *"we have spent an hour not knowing
 * which field is objecting, and we still do not"*.
 *
 * ## What was actually wrong, which is broader than the one form they hit
 *
 * The page rendered `saveError` inside a block guarded by `showsSave()` — a computed returning the literal
 * `false`. So the block never rendered, and with it went the only place `saveError` and `saveOk` were shown
 * ANYWHERE on this page. Every per-card and per-pipeline Save sets them; nothing displayed either. A refusal
 * on any of them looked exactly like a button that did nothing.
 *
 * ## What this spec pins
 *
 * That the reason reaches the screen, and that it is the SERVER's reason rather than a generic one — a page
 * that said "Save failed" would pass a naive test and leave the operator exactly where they were.
 */
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { MediaProcessingPageComponent } from './media-processing-page.component';
import { MediaProcessingStateService } from './media-processing-state.service';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';
import { PipelineStatusService } from './pipeline-status.service';

const CFG = { visionProvider: 'local', sttProvider: 'local', documentProcessing: { mode: 'ocr' }, lockedByInfra: [] };

/**
 * The shape `GET /api/admin/pipeline-status` really answers with — three lists and a nested one.
 *
 * Every field here exists because a computed dereferences it unguarded, so an empty object is not a usable
 * stand-in. Kept minimal on purpose: this spec is about a message on the page, not about health dots.
 */
const STATUS = { models: [], sidecars: [], index: { spaces: [] } };

function mount(patchImpl: () => unknown) {
  TestBed.resetTestingModule();
  const http = {
    /*
     * BY URL, because two different shapes are served here and the page fetches both on mount. Returning the
     * media config for every GET meant the health-probe service read a config as a status payload and threw
     * from inside a computed — an error nowhere near this spec's subject.
     */
    get: vi.fn().mockImplementation((url: string) =>
      of(url.includes('pipeline-status') ? STATUS : CFG)),
    patch: vi.fn().mockImplementation(patchImpl),
    post: vi.fn().mockReturnValue(of({ reachable: true })),
  } as unknown as HttpClient;
  TestBed.configureTestingModule({
    imports: [MediaProcessingPageComponent, getTranslocoModule()],
    providers: [
      MediaProcessingStateService,
      { provide: HttpClient, useValue: http },
      { provide: ConfirmDialogService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
      PipelineStatusService,
    ],
  });
  /*
   * OVERRIDDEN ON THE COMPONENT, not only in the TestBed.
   *
   * The page declares `providers: [MediaProcessingStateService, PipelineStatusService]` itself, so a
   * component-level provider shadows anything configured on the module — the fakes above were being ignored
   * and the real `PipelineStatusService` was constructed, which then threw inside a computed. The failure
   * surfaced as `Cannot read properties of undefined` from the pipelines tab, nowhere near the cause.
   */
  TestBed.overrideComponent(MediaProcessingPageComponent, {
    /*
     * The REAL PipelineStatusService, fed the mocked HttpClient.
     *
     * Hand-faking it was a losing game — three methods deep and each missing one threw from inside a
     * computed, surfacing as an error nowhere near this spec's subject. The real one asks the same mocked
     * `get` as everything else here, which is both less code and a truer mount.
     */
    set: { providers: [MediaProcessingStateService, PipelineStatusService] },
  });
  const fixture = TestBed.createComponent(MediaProcessingPageComponent);
  /*
   * The TOOLS tab, not the default Pipelines one.
   *
   * The block under test belongs to the PAGE, not to any tab, so which tab is open is irrelevant to what is
   * being asserted — and the Pipelines tab builds its step list from a live pipeline-status shape that this
   * spec would otherwise have to reproduce field by field. Two rounds of that produced errors from inside a
   * computed, nowhere near the subject. Rendering a quieter tab tests the same thing and depends on less.
   */
  fixture.componentInstance.tab.set('tools');
  fixture.detectChanges();
  return fixture;
}

/**
 * The state the COMPONENT is using, which is not the one the TestBed hands out.
 *
 * The page declares its own `providers`, so it gets a fresh instance from its own injector. Driving the
 * module-level one saved nothing the page was watching: both assertions failed against a fix that works.
 */
function stateOf(fixture: ComponentFixture<MediaProcessingPageComponent>): MediaProcessingStateService {
  return fixture.debugElement.injector.get(MediaProcessingStateService);
}

describe('a refused save says why', () => {
  it('shows the reason the server gave, not a generic failure', async () => {
    const fixture = mount(() => throwError(() => ({ error: { error: 'extraction mode `repair` needs a repair model' } })));
    const state = stateOf(fixture);

    expect(fixture.nativeElement.querySelector('.save-error'), 'nothing has failed yet').toBeFalsy();

    await state.savePipe('pipe-documents');
    fixture.detectChanges();

    const shown = fixture.nativeElement.querySelector('.save-error');
    expect(shown, 'a refused save rendered nothing at all — the button just looks inert').toBeTruthy();
    // The SERVER's sentence. "Save failed" would satisfy a weaker assertion and leave the operator exactly
    // where the canary was: knowing it failed, not knowing which field objected.
    expect(shown.textContent).toContain('needs a repair model');
  });

  it('shows the confirmation when it succeeded, so silence never means either', async () => {
    /*
     * Both directions, deliberately. A page that only ever renders errors makes SILENCE the success signal,
     * which is the same ambiguity in the other direction — and it is what the semantic-search panel was
     * fixed for on the same day.
     */
    const fixture = mount(() => of({ ok: true, config: CFG }));
    const state = stateOf(fixture);

    await state.savePipe('pipe-documents');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.save-ok'), 'a successful save said nothing').toBeTruthy();
    expect(fixture.nativeElement.querySelector('.save-error')).toBeFalsy();
  });
});
