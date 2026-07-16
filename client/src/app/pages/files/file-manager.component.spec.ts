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

  it('opens the preview overlay when the previewFile signal is set (OnPush re-checks the signal)', () => {
    const fixture = create([fileEntry('photo.bin')]);
    expect(fixture.nativeElement.querySelector('.preview-overlay')).toBeNull();

    fixture.componentInstance.previewKind.set('unknown');
    fixture.componentInstance.previewFile.set(fileEntry('photo.bin'));
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('.preview-overlay');
    expect(overlay).toBeTruthy();
    expect(text(fixture)).toContain('photo.bin');
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
