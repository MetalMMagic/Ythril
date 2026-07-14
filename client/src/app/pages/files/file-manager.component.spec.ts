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
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ApiService, type FileEntry } from '../../core/api.service';
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
  } as unknown as ApiService;
}

describe('FileManagerComponent (OnPush)', () => {
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  function create(entries: FileEntry[]) {
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: ApiService, useValue: makeApi(entries) },
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
