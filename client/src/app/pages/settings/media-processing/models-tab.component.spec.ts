/**
 * ModelsTabComponent — face-recognition Person Entity Types picker (item 16).
 *
 * The field is sourced from the Schema Library's entity types, but any already-stored value stays
 * selectable/removable. These tests exercise the component logic directly (no template render), so the
 * services are light mocks.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { getTranslocoModule } from '../../../testing/transloco-testing';
import { ModelsTabComponent } from './models-tab.component';
import { MediaProcessingStateService } from './media-processing-state.service';
import { PipelineStatusService } from './pipeline-status.service';
import { SchemaApi } from '../../../core/schema-api.service';
import { HttpClient } from '@angular/common/http';
import { ConfirmDialogService } from '../../../core/confirm-dialog.service';

function setup(libEntries: { knowledgeType: string; typeName: string }[] = [], initialTypes?: string[]) {
  const touched = vi.fn();
  const state = {
    face: { personEntityTypes: initialTypes } as { personEntityTypes?: string[] },
    touched: { set: touched },
    faceLocked: () => false,
    managed: false,
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ModelsTabComponent, getTranslocoModule()],
    providers: [
      { provide: MediaProcessingStateService, useValue: state },
      { provide: PipelineStatusService, useValue: { status: () => null, bySidecarKey: () => new Map() } },
      { provide: SchemaApi, useValue: { listSchemaLibrary: () => of({ entries: libEntries }) } },
    ],
  });
  const c = TestBed.createComponent(ModelsTabComponent).componentInstance;
  c.ngOnInit(); // loads libEntityTypes from the mocked library
  return { c, state, touched };
}

describe('ModelsTabComponent — person-types picker', () => {
  it('loads entity types from the library (entities only, deduped, sorted)', () => {
    const { c } = setup([
      { knowledgeType: 'entity', typeName: 'person' },
      { knowledgeType: 'memory', typeName: 'note' },     // non-entity, excluded
      { knowledgeType: 'entity', typeName: 'org' },
      { knowledgeType: 'entity', typeName: 'person' },    // dup
    ]);
    expect(c.libEntityTypes()).toEqual(['org', 'person']);
  });

  it('availablePersonTypes excludes already-selected types', () => {
    const { c } = setup([
      { knowledgeType: 'entity', typeName: 'person' },
      { knowledgeType: 'entity', typeName: 'org' },
    ], ['person']);
    expect(c.availablePersonTypes()).toEqual(['org']);
  });

  it('addPersonType adds a type (no dup) and marks the form touched', () => {
    const { c, state, touched } = setup([{ knowledgeType: 'entity', typeName: 'org' }], ['person']);
    c.addPersonType('org');
    expect(state.face.personEntityTypes).toEqual(['person', 'org']);
    expect(touched).toHaveBeenCalledWith(true);
    // adding a dup is a no-op
    c.addPersonType('org');
    expect(state.face.personEntityTypes).toEqual(['person', 'org']);
  });

  it('removePersonType drops the type and marks the form touched', () => {
    const { c, state, touched } = setup([], ['person', 'org']);
    c.removePersonType('person');
    expect(state.face.personEntityTypes).toEqual(['org']);
    expect(touched).toHaveBeenCalledWith(true);
  });

  it('keeps a stored type that is no longer in the library (still removable)', () => {
    // 'legacy' is stored but not in the library — it must stay listed and removable.
    const { c, state } = setup([{ knowledgeType: 'entity', typeName: 'person' }], ['legacy']);
    expect(state.face.personEntityTypes).toContain('legacy');
    expect(c.availablePersonTypes()).toEqual(['person']);   // library options don't include the stored 'legacy'
    c.removePersonType('legacy');
    expect(state.face.personEntityTypes).toEqual([]);
  });
});

/**
 * The per-card Save button, asserted in the DOM.
 *
 * The service tests drive `cardDirty`/`saveCard` directly, which is exactly the blind spot that let the
 * graph panel's filters ship documented-but-unreachable: logic that works, wired to no control. A
 * mutation that stopped rendering these buttons entirely survived the service suite. So this renders the
 * real template against the real service and asserts the button is THERE, in the right card and no other.
 */
describe('ModelsTabComponent — per-card Save button', () => {
  function render(cfg: Record<string, unknown>) {
    TestBed.resetTestingModule();
    const patch = vi.fn().mockReturnValue(of({ ok: true, config: cfg }));
    const http = { get: vi.fn().mockReturnValue(of(cfg)), patch, post: vi.fn().mockReturnValue(of({})) };
    TestBed.configureTestingModule({
      imports: [ModelsTabComponent, getTranslocoModule()],
      providers: [
        MediaProcessingStateService,
        { provide: HttpClient, useValue: http },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn().mockResolvedValue(true) } },
        // The rendered template asks for more of this service than the logic-only tests do.
        { provide: PipelineStatusService, useValue: {
          status: () => null, bySidecarKey: () => new Map(),
          modelState: () => null, sidecarState: () => null,
        } },
        { provide: SchemaApi, useValue: { listSchemaLibrary: () => of({ entries: [] }) } },
      ],
    });
    const state = TestBed.inject(MediaProcessingStateService);
    state.load();
    const fixture = TestBed.createComponent(ModelsTabComponent);
    fixture.detectChanges();
    return { fixture, state };
  }

  const CFG = {
    visionProvider: 'local', sttProvider: 'local',
    vision: { baseUrl: 'http://ollama:11434', model: 'llava' },
    stt: { baseUrl: 'http://whisper:9000', model: 'base' },
    embedding: { provider: 'local', model: 'nomic', dimensions: 768, similarity: 'cosine' },
    documentProcessing: { mode: 'ocr', assistModel: {} },
    faceRecognition: { enabled: false },
    lockedByInfra: [],
  };

  const saveIn = (fixture: { nativeElement: HTMLElement }, card: string) =>
    fixture.nativeElement.querySelector(`#model-card-${card} .card-save`);

  it('shows no Save button until something changes', () => {
    const { fixture } = render(CFG);
    expect(fixture.nativeElement.querySelectorAll('.card-save').length).toBe(0);
  });

  it('shows Save in the edited card and in NO other', () => {
    const { fixture, state } = render(CFG);
    state.form.stt!.model = 'large-v3';
    state.touched.set(true);
    fixture.detectChanges();

    expect(saveIn(fixture, 'stt'), 'the edited card').toBeTruthy();
    for (const other of ['embedding', 'vision', 'assist', 'face']) {
      expect(saveIn(fixture, other), `${other} must not offer a save`).toBeNull();
    }
  });

  it('never offers Save on the env-only cards', () => {
    // doc-render and unstructured report infrastructure and have no editable field; a button there
    // would be a control that cannot do anything.
    const { fixture, state } = render(CFG);
    state.form.stt!.model = 'large-v3';
    state.touched.set(true);
    fixture.detectChanges();

    expect(saveIn(fixture, 'doc-render')).toBeNull();
    expect(saveIn(fixture, 'unstructured')).toBeNull();
  });

  it('clicking it saves that card', () => {
    const { fixture, state } = render(CFG);
    const spy = vi.spyOn(state, 'saveCard');
    state.form.vision!.model = 'moondream';
    state.touched.set(true);
    fixture.detectChanges();

    (saveIn(fixture, 'vision') as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalledWith('vision');
  });
});
