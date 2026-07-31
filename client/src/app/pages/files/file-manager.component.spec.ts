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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, Observable, Subject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { type FileEntry, type FileMeta, type UploadProgress } from '../../core/api.types';
import { FilesApi } from '../../core/files-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { AuthService } from '../../core/auth.service';
import { BrainStore } from '../brain/brain-store.service';
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

/**
 * B.6 — the Extract tab: what retrieval actually sees.
 *
 * Hiding `_converted/` and `_extracted/` was right and took away the only way to answer "what did the
 * pipeline get out of this file?". These pin the two things that decide whether the tab is trustworthy: it
 * is only offered for a file that HAS an extract, and it fetches once, when opened — not on every file open.
 */
describe('FileManagerComponent — the Extract tab', () => {
  const EXTRACT = {
    path: 'a/report.pdf', chunkTotal: 3, limit: 100, skip: 0,
    converted: { path: '_converted/a/report.pdf.md', markdown: '# Report', truncated: false, sizeBytes: 8 },
    chunks: [
      { id: 'a/report.pdf#chunk0', index: 0, headingText: 'Overview', content: 'first chunk', chunkOffsetMs: null, chunkDurationMs: null },
      { id: 'a/report.pdf#chunk1', index: 1, headingText: null, content: 'second chunk', chunkOffsetMs: 65_000, chunkDurationMs: 30_000 },
    ],
    images: [{ path: '_extracted/a/report.pdf/image-0.png', description: 'A signature block.', descriptionSource: 'generated', sizeBytes: 10 }],
  };

  function open(meta: Partial<FileMeta> | null, extract: unknown = EXTRACT) {
    const entries = [{ name: 'report.pdf', isFile: true, isDirectory: false, size: 10, modified: '2026-01-01' } as FileEntry];
    const getFileExtract = vi.fn().mockReturnValue(of(extract));
    const api = {
      listSpaces: () => of({ spaces: [] }),
      listFiles: () => of({ entries }),
      getFileDownloadUrl: () => '/x',
      getFileMeta: () => of(meta),
      getFileExtract,
    } as any;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: api },
        { provide: SpacesApi, useValue: api },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
        { provide: BrainStore, useValue: new BrainStore() },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    fixture.componentRef.setInput('embeddedSpaceId', 'work');
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.openPreview(entries[0]!);
    fixture.detectChanges();
    return { fixture, c, getFileExtract };
  }

  it('is offered for a file that went through the pipeline', () => {
    expect(open({ chunkCount: 3 } as FileMeta).c.hasExtract()).toBe(true);
    expect(open({ convertedFileId: '_converted/x.md' } as FileMeta).c.hasExtract()).toBe(true);
    expect(open({ mediaType: 'audio' } as FileMeta).c.hasExtract()).toBe(true);
  });

  it('is NOT offered for a file that has none', () => {
    // A tab that is always there and always says "nothing here" teaches people to ignore it.
    expect(open({ chunkCount: 0 } as FileMeta).c.hasExtract()).toBe(false);
    expect(open(null).c.hasExtract()).toBe(false);
  });

  it('fetches only when opened, and only once', () => {
    const { c, getFileExtract, fixture } = open({ chunkCount: 3 } as FileMeta);
    expect(getFileExtract, 'opening a file must not fetch the extract').not.toHaveBeenCalled();
    c.showExtractMode();
    fixture.detectChanges();
    expect(getFileExtract).toHaveBeenCalledTimes(1);
    c.detailMode.set('preview');
    c.showExtractMode();
    expect(getFileExtract, 'switching back must not refetch').toHaveBeenCalledTimes(1);
  });

  it('renders the chunks, their provenance, and the caption', () => {
    const { c, fixture } = open({ chunkCount: 3 } as FileMeta);
    c.showExtractMode();
    fixture.detectChanges();
    const t = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(t).toContain('first chunk');
    expect(t).toContain('Overview');          // document provenance: the heading it opened
    expect(t).toContain('1:05-1:35');         // audio provenance: its position in the recording
    expect(t).toContain('A signature block.');
  });

  it('does not carry one file\'s extract onto another', () => {
    // It is fetched lazily, so a stale value would show one file's chunks under another file's name.
    const { c, fixture } = open({ chunkCount: 3 } as FileMeta);
    c.showExtractMode();
    fixture.detectChanges();
    expect(c.extract()).not.toBeNull();
    c.openPreview({ name: 'other.pdf', isFile: true, isDirectory: false, size: 1, modified: '2026-01-01' } as FileEntry);
    expect(c.extract()).toBeNull();
  });

  it('formats a chunk offset as a clock, and a document chunk as nothing', () => {
    const { c } = open({ chunkCount: 1 } as FileMeta);
    expect(c.msRange(0, null)).toBe('0:00');
    expect(c.msRange(65_000, 30_000)).toBe('1:05-1:35');
    expect(c.msRange(null, null)).toBe('');
  });

  it('appends the next page instead of replacing what is on screen', () => {
    const { c, fixture, getFileExtract } = open({ chunkCount: 3 } as FileMeta);
    c.showExtractMode();
    fixture.detectChanges();
    getFileExtract.mockReturnValue(of({
      ...EXTRACT, skip: 2,
      chunks: [{ id: 'a/report.pdf#chunk2', index: 2, headingText: null, content: 'third chunk', chunkOffsetMs: null, chunkDurationMs: null }],
    }));
    c.moreChunks({ name: 'report.pdf', isFile: true, isDirectory: false, size: 10, modified: '2026-01-01' } as FileEntry);
    fixture.detectChanges();
    expect(c.extract()!.chunks.map(x => x.content)).toEqual(['first chunk', 'second chunk', 'third chunk']);
  });
});

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

  // ── Live processing stage (replaces the generic "embedding" + spinner) ───────────────────────
  // The bar component and the server-side stage data both already existed; nothing joined them, so
  // every in-flight file said "embedding" for the whole job and looked the same working or wedged.
  describe('live processing stage', () => {
    const withProgress = (name: string, progress: FileEntry['progress'], status: FileEntry['embeddingStatus'] = 'processing') =>
      ({ ...fileEntry(name), embeddingStatus: status, progress, progressAt: new Date().toISOString() }) as FileEntry;

    it('draws the stage bar for a file whose job has reported a step', () => {
      const fixture = create([withProgress('scan.pdf', { step: 'vlm', steps: ['render', 'vlm'], done: 2, total: 9 })]);
      const row = fixture.nativeElement.querySelector('table tbody tr') as HTMLElement;
      expect(row.querySelector('app-step-progress-bar')).toBeTruthy();
      // The pill is REPLACED, not accompanied — two status indicators on one row is worse than either.
      expect(row.querySelector('.emb-pill')).toBeNull();
    });

    it('keeps the plain status pill when there is no stage to show', () => {
      // A finished file, and a claimed job that has not reported yet, both fall back here. Drawing an
      // empty bar for the latter would read as "zero progress" rather than "not known yet".
      const fixture = create([
        { ...fileEntry('done.pdf'), embeddingStatus: 'complete' } as FileEntry,
        { ...fileEntry('queued.pdf'), embeddingStatus: 'pending' } as FileEntry,
      ]);
      const rows = fixture.nativeElement.querySelectorAll('table tbody tr');
      expect(rows.length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('app-step-progress-bar').length).toBe(0);
      expect(fixture.nativeElement.querySelectorAll('.emb-pill').length).toBe(2);
    });
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

  // ── Column sort — restores what #421 dropped when File Meta merged into this tab ─────────────
  // Sorting is client-side ON PURPOSE here: listFiles returns a whole directory in one response, so
  // reordering it reorders the complete set (unlike the paginated record tabs, where a client sort
  // would reorder one page and misrepresent the rest).
  it('sorts entries by a column, keeps folders first, and clears back to server order', () => {
    const rowNames = (f: { nativeElement: HTMLElement }) =>
      Array.from(f.nativeElement.querySelectorAll('table tbody .file-name-btn'))
        .map(b => (b as HTMLElement).textContent?.trim());

    const big = { ...fileEntry('big.bin'), size: 9000 } as FileEntry;
    const small = { ...fileEntry('small.txt'), size: 10 } as FileEntry;
    const dir = fileEntry('zzz-folder', true);
    const fixture = create([big, small, dir]);   // server order: big, small, folder
    const c = fixture.componentInstance;

    expect(rowNames(fixture)).toEqual(['big.bin', 'small.txt', 'zzz-folder']); // untouched by default

    c.setSort('size');                            // 1st click → ascending
    fixture.detectChanges();
    // The folder leads despite its name sorting last and size 0 — folders always come first.
    expect(rowNames(fixture)).toEqual(['zzz-folder', 'small.txt', 'big.bin']);

    c.setSort('size');                            // 2nd click → descending
    fixture.detectChanges();
    expect(rowNames(fixture)).toEqual(['zzz-folder', 'big.bin', 'small.txt']);

    c.setSort('size');                            // 3rd click → cleared, server order returns
    fixture.detectChanges();
    expect(c.sortField()).toBe('');
    expect(rowNames(fixture)).toEqual(['big.bin', 'small.txt', 'zzz-folder']);
  });

  it('renders sortable headers for name, status, size and modified', () => {
    const fixture = create([fileEntry('a.txt')]);
    const sortable = fixture.nativeElement.querySelectorAll('table thead th[app-sort-th]');
    expect(sortable.length).toBe(4);
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
  // ^ One of the two specs that exposed the suite-wide timeout ceiling: it imports `exceljs` twice
  // (here for the fixture workbook, and again inside `renderXlsx`), so it runs long under a full
  // parallel run. No per-test override needed — `testTimeout` in vitest.config.ts covers the class.

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

/**
 * Live refresh while a file is processing.
 *
 * The shell opens an SSE stream and bumps `BrainStore.liveRefreshTick` on a `file.*` event — that is how
 * every record tab stays current. This list never read it. Status pill and processing stage bar are both
 * built from the DIRECTORY LISTING, so with no reload they sat at whatever they were when the folder was
 * opened: a file could finish and still read "Embedding" until you navigated away and back.
 *
 * Nothing errored, which is exactly why it presented as a slow pipeline rather than a stale view — so the
 * test asserts the RELOAD happens, not that a particular pill is drawn.
 */
describe('FileManagerComponent — live refresh on the shell tick', () => {
  function create(entries: FileEntry[]) {
    const api = makeApi(entries);
    const listFiles = vi.fn().mockReturnValue(of({ entries }));
    api.listFiles = listFiles;
    const store = new BrainStore();
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: api },
        { provide: SpacesApi, useValue: api },
        { provide: AuthService, useValue: { token: () => '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => '' } } } },
        { provide: BrainStore, useValue: store },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    fixture.componentRef.setInput('embeddedSpaceId', 'work');
    fixture.detectChanges();
    return { fixture, store, listFiles };
  }

  const PROCESSING: FileEntry[] = [
    { name: 'big.pdf', size: 10, isFile: true, isDirectory: false, modified: '2026-01-01', embeddingStatus: 'processing' } as FileEntry,
  ];

  it('re-lists the directory when the shell signals a change', () => {
    const { fixture, store, listFiles } = create(PROCESSING);
    const before = listFiles.mock.calls.length;

    store.liveRefreshTick.update(t => t + 1);
    fixture.detectChanges();

    expect(listFiles.mock.calls.length, 'a tick must re-list the directory').toBeGreaterThan(before);
  });

  it('lists the directory exactly ONCE on open — the effect must not double-load', () => {
    // The effect skips its own first run, because creating the component already listed the folder.
    // Without that guard every folder open costs two identical requests. Asserting the absolute count is
    // what catches it: measuring "no further calls AFTER creation" is blind, since the duplicate already
    // happened by then.
    // Two, not one: opening a folder lists the folder AND the tree root. Three would mean the effect
    // ran on its own first tick and re-listed on top of the initial load.
    const { listFiles } = create(PROCESSING);
    expect(listFiles.mock.calls.length, 'folder + tree root, and nothing more').toBe(2);
  });

  /**
   * B.5 — the stage bar has to ADVANCE, not just react to completion.
   *
   * The tick above fires on `file.*` SSE events, which are brain writes. Per-page progress is not one:
   * `touchJobProgress` writes a heartbeat and publishes nothing, so the bar was drawn once from the
   * listing that was current when the folder was opened and sat at "page 12 of 40" for the whole
   * conversion. The reporter read that as a wedged pipeline.
   *
   * A poll is the honest mechanism for a value with no event behind it — so what these pin is that it is
   * bounded: only while something on screen is in flight, never stacked, never after the view is gone.
   */
  describe('the processing poll', () => {
    const IDLE: FileEntry[] = [
      { name: 'done.pdf', size: 10, isFile: true, isDirectory: false, modified: '2026-01-01', embeddingStatus: 'complete' } as FileEntry,
    ];

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('re-lists while a file is processing, without waiting for an event', () => {
      const { listFiles } = create(PROCESSING);
      const before = listFiles.mock.calls.length;
      vi.advanceTimersByTime(4_000);
      expect(listFiles.mock.calls.length, 'the poll must re-list').toBeGreaterThan(before);
    });

    it('keeps going — a stage bar that advances once is still stuck', () => {
      const { listFiles } = create(PROCESSING);
      const before = listFiles.mock.calls.length;
      vi.advanceTimersByTime(12_000);
      expect(listFiles.mock.calls.length - before).toBeGreaterThanOrEqual(3);
    });

    it('does NOT poll an idle folder', () => {
      // The cost of getting this wrong is a permanent background request loop on every open folder in
      // every tab, which is worse than the stale bar it was meant to fix.
      const { listFiles } = create(IDLE);
      const before = listFiles.mock.calls.length;
      vi.advanceTimersByTime(20_000);
      expect(listFiles.mock.calls.length).toBe(before);
    });

    it('stops once the file finishes', () => {
      const { fixture, listFiles } = create(PROCESSING);
      // The next listing reports it complete — as the real one does when the job lands.
      listFiles.mockReturnValue(of({ entries: IDLE }));
      vi.advanceTimersByTime(4_000);
      fixture.detectChanges();
      const after = listFiles.mock.calls.length;
      vi.advanceTimersByTime(20_000);
      expect(listFiles.mock.calls.length, 'the poll must retire itself').toBe(after);
    });

    it('never stacks two timers, however many listings land', () => {
      const { fixture, listFiles } = create(PROCESSING);
      // Three more loads, each of which calls the sync — a start-per-load would triple the rate.
      for (let i = 0; i < 3; i++) { fixture.componentInstance.reloadDir(); fixture.detectChanges(); }
      const before = listFiles.mock.calls.length;
      vi.advanceTimersByTime(4_000);
      expect(listFiles.mock.calls.length - before).toBe(1);
    });

    it('does not poll while the Extract tab is open either — same in-flight rule', () => {
      // The poll follows what is on screen, not which face of the pane is showing: a file still being
      // converted is the case where the Extract tab is most worth refreshing.
      const { fixture, listFiles } = create(PROCESSING);
      fixture.componentInstance.detailMode.set('extract');
      const before = listFiles.mock.calls.length;
      vi.advanceTimersByTime(4_000);
      expect(listFiles.mock.calls.length).toBeGreaterThan(before);
    });

    it('is cleared on destroy, so it cannot outlive the view', () => {
      const { fixture, listFiles } = create(PROCESSING);
      fixture.destroy();
      const after = listFiles.mock.calls.length;
      vi.advanceTimersByTime(20_000);
      expect(listFiles.mock.calls.length).toBe(after);
    });
  });
});
