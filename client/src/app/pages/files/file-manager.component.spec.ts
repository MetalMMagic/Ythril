/**
 * FileManagerComponent — verifies the OnPush conversion (P5, slice 3).
 *
 * All rendered state here is signal-backed: the file listing (`entries`), the directory tree
 * (`treeRoot`), breadcrumbs, and the preview pane (`previewFile`/`previewKind`). The tree code
 * mutates a node in place on expand but always follows with `treeRoot.set([...])`, and the async
 * preview/upload callbacks use signal `.set()` — both of which mark an OnPush view dirty. These
 * tests are the regression guard: after switching to OnPush, each signal-driven view must still
 * refresh. The harness's negative control (change-detection-harness.spec.ts) separately proves the
 * harness can see a stale OnPush view, so a passing assertion here means a real refresh occurred.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, Observable, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { type FileEntry, type UploadProgress } from '../../core/api.types';
import { FilesApi } from '../../core/files-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { AuthService } from '../../core/auth.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { FileManagerComponent } from './file-manager.component';

function fileEntry(name: string, isDir = false): FileEntry {
  return {
    name,
    isDirectory: isDir,
    isFile: !isDir,
    size: isDir ? 0 : 123,
    modified: '2026-07-14T10:00:00.000Z',
  } as FileEntry;
}

function makeApi(entries: FileEntry[]) {
  return {
    listSpaces: () => of({ spaces: [] }),
    listFiles: () => of({ entries }),
    getFileDownloadUrl: (spaceId: string, path: string) => `/api/files/${spaceId}${path}`,
    getFileMeta: () => of(null), // opening a file fetches its meta record; no record in these fixtures
  } as any;
}

describe('FileManagerComponent (OnPush)', () => {
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  function create(entries: FileEntry[]) {
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: makeApi(entries) },
        { provide: SpacesApi, useValue: makeApi(entries) },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    // Embedded path: skips space loading and drives straight to selectSpace → loadDir + loadTreeRoot.
    fixture.componentRef.setInput('embeddedSpaceId', 'work');
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('is compiled as OnPush', () => {
    expect(FileManagerComponent.ɵcmp?.onPush).toBe(true);
  });

  it('renders a row per file entry after load (signal-driven view updates under OnPush)', () => {
    const fixture = create([fileEntry('readme.md'), fileEntry('notes.txt'), fileEntry('sub', true)]);
    const names = Array.from(fixture.nativeElement.querySelectorAll('table tbody .file-name-btn')).map(
      (b) => (b as HTMLElement).textContent?.trim(),
    );
    expect(names).toContain('readme.md');
    expect(names).toContain('notes.txt');
    expect(names).toContain('sub');
  });

  it('renders a tree node for each subdirectory (treeRoot signal)', () => {
    const fixture = create([fileEntry('docs', true), fileEntry('src', true), fileEntry('readme.md')]);
    const treeText = Array.from(fixture.nativeElement.querySelectorAll('.tree-node')).map(
      (n) => (n as HTMLElement).textContent?.trim(),
    );
    // Only directories become tree nodes; the file must not.
    expect(treeText.some((t) => t?.includes('docs'))).toBe(true);
    expect(treeText.some((t) => t?.includes('src'))).toBe(true);
    expect(treeText.some((t) => t?.includes('readme.md'))).toBe(false);
  });

  it('opens the docked detail pane when the previewFile signal is set (OnPush re-checks the signal)', () => {
    const fixture = create([fileEntry('photo.bin')]);
    // The list runs full width until a file is opened — no detail column yet.
    expect(fixture.nativeElement.querySelector('.fm-detail')).toBeNull();

    fixture.componentInstance.previewKind.set('unknown');
    fixture.componentInstance.previewFile.set(fileEntry('photo.bin'));
    fixture.detectChanges();

    const detail = fixture.nativeElement.querySelector('.fm-detail');
    expect(detail).toBeTruthy();
    expect(text(fixture)).toContain('photo.bin');
    // Opening a file shows the preview face first.
    expect(fixture.componentInstance.detailMode()).toBe('preview');
    // Embedded in the Brain (create() sets embeddedSpaceId) → the [Preview | File meta] toggle is offered.
    expect(fixture.nativeElement.querySelector('.seg-toggle')).toBeTruthy();
  });

  it('hides the File-meta toggle when NOT embedded (meta editing needs the Brain-provided picker)', () => {
    const fixture = create([fileEntry('photo.bin')]);
    // Standalone /files route: no Brain injector, so meta editing is unavailable — preview only.
    fixture.componentInstance.embeddedSpaceId = '';
    fixture.componentInstance.previewKind.set('unknown');
    fixture.componentInstance.previewFile.set(fileEntry('photo.bin'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.fm-detail')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.seg-toggle')).toBeNull();
  });

  it('renders markdown FORMATTED (not as highlighted source) in the preview face', () => {
    const fixture = create([fileEntry('doc.md')]);
    fixture.componentInstance.previewFile.set(fileEntry('doc.md'));
    fixture.componentInstance.previewKind.set('markdown');
    fixture.componentInstance.previewHtml.set('<h1>Hello</h1><p>world</p>');
    fixture.detectChanges();
    const md = fixture.nativeElement.querySelector('.md-rendered') as HTMLElement | null;
    expect(md).toBeTruthy();
    expect(md!.querySelector('h1')?.textContent).toContain('Hello');
    // A .md must NOT fall through to the source-code (<pre class="preview-code">) branch.
    expect(fixture.nativeElement.querySelector('.preview-code')).toBeNull();
  });

  it('sanitizes rendered markdown — scripts/handlers are stripped before the trusted bind', async () => {
    // The markdown HTML is bound with bypassSecurityTrustHtml (it may carry inlined mermaid SVG), so the
    // component must sanitize it itself. This pins that a <script> and an inline handler don't survive.
    const fixture = create([fileEntry('x.md')]);
    const html = await (fixture.componentInstance as unknown as {
      renderMarkdown(t: string): Promise<string>;
    }).renderMarkdown('# Title\n\n<img src=x onerror="alert(1)">\n\n<script>alert(2)</script>\n');
    expect(html).toContain('<h1'); // prose still renders
    expect(html.toLowerCase()).not.toContain('onerror');
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('parses an .xlsx into a capped first-sheet grid (header + rows, no note when small)', async () => {
    const mod = await import('exceljs');
    const ExcelJS = (mod as unknown as { default?: unknown }).default ?? mod;
    const wb = new (ExcelJS as { Workbook: new () => any }).Workbook();
    const ws = wb.addWorksheet('Data');
    ws.addRow(['Name', 'Age']);
    ws.addRow(['Alice', 30]);
    ws.addRow(['Bob', 25]);
    const buf = await wb.xlsx.writeBuffer();

    const fixture = create([fileEntry('sheet.xlsx')]);
    const table = await (fixture.componentInstance as unknown as {
      renderXlsx(b: ArrayBuffer): Promise<{ sheet: string; header: string[]; rows: string[][]; note: string | null }>;
    }).renderXlsx(buf as ArrayBuffer);

    expect(table.sheet).toBe('Data');
    expect(table.header).toEqual(['Name', 'Age']);
    expect(table.rows[0]).toEqual(['Alice', '30']); // values coerced to display text
    expect(table.rows[1]).toEqual(['Bob', '25']);
    expect(table.note).toBeNull(); // small sheet → not truncated
  });

  it('toggles the full-screen preview overlay; Escape collapses it before closing the pane', () => {
    const fixture = create([fileEntry('doc.md')]);
    fixture.componentInstance.previewFile.set(fileEntry('doc.md'));
    fixture.componentInstance.previewKind.set('markdown');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-fs-overlay')).toBeNull();

    fixture.componentInstance.previewFullscreen.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.preview-fs-overlay')).toBeTruthy();

    // First Escape collapses full-screen but leaves the docked pane open.
    fixture.componentInstance.onPreviewKey(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.previewFullscreen()).toBe(false);
    expect(fixture.componentInstance.previewFile()).toBeTruthy();
  });

  it('re-renders the listing when the entries signal is replaced (not just on first load)', () => {
    const fixture = create([fileEntry('first.md')]);
    const body = () => (fixture.nativeElement.querySelector('table tbody') as HTMLElement).textContent ?? '';
    expect(body()).toContain('first.md');
    expect(body()).not.toContain('second.md');

    fixture.componentInstance.entries.set([fileEntry('second.md')]);
    fixture.detectChanges();

    expect(body()).toContain('second.md');
    expect(body()).not.toContain('first.md');
  });
});

// ── Upload queue (U12) ────────────────────────────────────────────────────────

/** Build an api whose uploadFileChunked hands back a controllable Subject per call. */
function makeUploadApi() {
  const streams: Subject<UploadProgress>[] = [];
  const calls: { file: File }[] = [];
  const uploadFileChunked = vi.fn((_s: string, _p: string, file: File): Observable<UploadProgress> => {
    const subj = new Subject<UploadProgress>();
    streams.push(subj);
    calls.push({ file });
    return subj.asObservable();
  });
  const api = {
    listSpaces: () => of({ spaces: [] }),
    listFiles: () => of({ entries: [] }),
    getFileDownloadUrl: (s: string, p: string) => `/api/files/${s}${p}`,
    uploadFileChunked,
  } as any;
  return { api, streams, calls, uploadFileChunked };
}

function fakeFileList(names: string[]): FileList {
  const files = names.map(n => new File(['x'], n));
  return { ...files, length: files.length, item: (i: number) => files[i] } as unknown as FileList;
}

describe('FileManagerComponent — upload queue (U12)', () => {
  let mock: ReturnType<typeof makeUploadApi>;

  function create() {
    mock = makeUploadApi();
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: mock.api },
        { provide: SpacesApi, useValue: mock.api },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    fixture.componentRef.setInput('embeddedSpaceId', 'work');
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  const rows = (fx: { nativeElement: HTMLElement }) =>
    Array.from(fx.nativeElement.querySelectorAll('.upload-row'));

  it('shows one row per file and uploads them one at a time', () => {
    const fx = create();
    const comp = fx.componentInstance;
    (comp as any).enqueueUploads(fakeFileList(['a.txt', 'b.txt']));
    fx.detectChanges();

    // Two rows; only the first upload has started (serialised queue).
    expect(rows(fx).length).toBe(2);
    expect(mock.uploadFileChunked).toHaveBeenCalledTimes(1);
    expect(comp.uploads()[0].status).toBe('uploading');
    expect(comp.uploads()[1].status).toBe('queued');

    // Finish the first → second starts.
    mock.streams[0].next({ percent: 100, done: true });
    mock.streams[0].complete();
    fx.detectChanges();
    expect(comp.uploads()[0].status).toBe('done');
    expect(mock.uploadFileChunked).toHaveBeenCalledTimes(2);
    expect(comp.uploads()[1].status).toBe('uploading');

    mock.streams[1].next({ percent: 100, done: true });
    mock.streams[1].complete();
    fx.detectChanges();
    expect(comp.uploads()[1].status).toBe('done');
  });

  it('marks a failed upload and re-queues it on retry', () => {
    const fx = create();
    const comp = fx.componentInstance;
    (comp as any).enqueueUploads(fakeFileList(['a.txt']));
    fx.detectChanges();

    mock.streams[0].error({ error: { error: 'disk full' } });
    fx.detectChanges();
    expect(comp.uploads()[0].status).toBe('failed');
    expect(comp.uploads()[0].error).toBe('disk full');
    // A Retry button is offered (test transloco renders the raw key).
    expect(fx.nativeElement.textContent).toContain('common.retry');

    comp.retryUpload(comp.uploads()[0]);
    fx.detectChanges();
    expect(comp.uploads()[0].status).toBe('uploading');
    expect(mock.uploadFileChunked).toHaveBeenCalledTimes(2);
  });

  it('cancel drops the row and advances the queue (abort is covered in the api.service spec)', () => {
    const fx = create();
    const comp = fx.componentInstance;
    (comp as any).enqueueUploads(fakeFileList(['a.txt', 'b.txt']));
    fx.detectChanges();

    comp.cancelUpload(comp.uploads()[0]);
    fx.detectChanges();

    // Row a.txt is gone; b.txt takes over.
    expect(comp.uploads().length).toBe(1);
    expect(comp.uploads()[0].name).toBe('b.txt');
    expect(comp.uploads()[0].status).toBe('uploading');
    expect(mock.uploadFileChunked).toHaveBeenCalledTimes(2);
  });

  it('clears finished rows but keeps active/queued ones', () => {
    const fx = create();
    const comp = fx.componentInstance;
    (comp as any).enqueueUploads(fakeFileList(['a.txt', 'b.txt']));
    // Finish the first.
    mock.streams[0].next({ percent: 100, done: true });
    mock.streams[0].complete();
    fx.detectChanges();

    expect(comp.hasFinishedUploads()).toBe(true);
    comp.clearFinishedUploads();
    fx.detectChanges();
    // Only the still-uploading b.txt remains.
    expect(comp.uploads().map(u => u.name)).toEqual(['b.txt']);
  });
});

// ── File preview / download auth (regression from #134 query-token scoping) ────
describe('FileManagerComponent — preview/download auth', () => {
  beforeEach(() => TestBed.resetTestingModule());

  function create(token: string) {
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: makeApi([]) },
        { provide: SpacesApi, useValue: makeApi([]) },
        { provide: AuthService, useValue: { token: () => token } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    fixture.componentRef.setInput('embeddedSpaceId', 'work');
    fixture.detectChanges();
    return fixture;
  }

  it('downloadFile sends the token in the Authorization header, never in the URL', async () => {
    const fixture = create('T');
    const calls: { url: unknown; opts: any }[] = [];
    const origFetch = globalThis.fetch;
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    globalThis.fetch = vi.fn((url: unknown, opts: any) => {
      calls.push({ url, opts });
      return Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) } as Response);
    }) as unknown as typeof fetch;
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    try {
      await fixture.componentInstance.downloadFile(
        { name: 'photo.png', isDirectory: false, isFile: true, size: 1, modified: '' } as FileEntry,
      );
    } finally {
      globalThis.fetch = origFetch;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
    expect(calls.length).toBe(1);
    // #134 scoped the ?token= fallback to SSE only — the token must NOT ride in the URL.
    expect(String(calls[0].url)).not.toContain('token=');
    expect(calls[0].opts.headers.Authorization).toBe('Bearer T');
  });
});
