/**
 * FileManagerComponent — characterization tests for G-3.
 *
 * ## What these are, and what they are not
 *
 * They pin the behaviour **as it is today**, before the file is split. They are not a statement that every
 * behaviour here is right — a characterization test's job is to make a refactor's regressions loud, and that
 * requires recording what happens rather than what should. Where something looks like a defect it is marked
 * `AS-IS` with what it does, and changing it must be a deliberate edit to the assertion rather than a
 * deletion. That convention is what let the graph extraction (G-2, G-5, G-6) land three real bugs as
 * three-line diffs instead of archaeology.
 *
 * ## Why this file, and why now
 *
 * `file-manager.component.ts` is 1 618 code lines, the largest in the repo, and its spec never mentions **69
 * of its 117 members**. It is one component doing the browser, the upload flow, the preview, the extract tab
 * and the per-file metadata drawer, and each of those is a plausible seam — so each is a place a lost binding
 * can hide. The repo rule is characterization tests first, as their own change, proven green against the
 * original code.
 *
 * ## Chosen for where a split would actually break something
 *
 * Not coverage for its own sake. Each block below is a seam whose behaviour is non-obvious, is invisible when
 * wrong, or spans two of the concerns the split will separate:
 *
 *   - **sorting** — folders-before-files is enforced ahead of the chosen column, and the third click clears
 *     back to the server's order rather than cycling. Both are easy to lose when a table header becomes a
 *     shared primitive.
 *   - **paths** — `join` and the breadcrumb accumulator are the only two places that build a path, and they
 *     disagree about nothing today. A split that gives the tree its own copy is exactly how they start to.
 *   - **the preview object URL** — a leak is invisible, and so is a premature revoke. Nothing else in this
 *     page owns a resource that must be released.
 *   - **the metadata edit model** — a plain object beside signals, re-seeded on open and on cancel. It is the
 *     one piece of state here that a signal-based extraction would silently change the semantics of.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { FilesApi } from '../../core/files-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { AuthService } from '../../core/auth.service';
import { getTranslocoModule } from '../../testing/transloco-testing';
import { FileManagerComponent } from './file-manager.component';

/** Read-only stubs: this file exercises pure derivation and local state, never a request. */
function makeApi() {
  return {
    listSpaces: () => of({ spaces: [{ id: 'work', label: 'work' }] }),
    listFiles: () => of({ entries: [], path: '/' }),
    getFileDownloadUrl: () => of({ url: '' }),
    getFileExtract: () => of(null),
    createDir: () => of({}),
    deleteFile: () => of({}),
    moveFile: () => of({}),
    retryEmbedding: () => of({}),
    getSpaceStats: () => of({ memories: 0, entities: 0, edges: 0, chrono: 0, files: 0 }),
    getSpaceMeta: () => of({ tagSuggestions: [], typeSchemas: {} }),
    getFileMeta: () => of(null),
    updateFileMeta: () => of({}),
    getExtractStatus: () => of(null),
  } as any;
}

function create() {
  TestBed.configureTestingModule({
    imports: [FileManagerComponent, getTranslocoModule()],
    providers: [
      { provide: FilesApi, useValue: makeApi() },
      { provide: SpacesApi, useValue: makeApi() },
      { provide: BrainApi, useValue: makeApi() },
      { provide: AuthService, useValue: { token: () => 't' } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } }, queryParamMap: of() } },
    ],
  });
  const fixture = TestBed.createComponent(FileManagerComponent);
  fixture.detectChanges();
  return fixture.componentInstance as any;
}

/**
 * jsdom implements neither half of the object-URL API, so there is nothing to spy ON — `spyOn` refuses a
 * method that does not exist, which is the right refusal and not a reason to skip the case. Defining it makes
 * the seam testable; the alternative is that the one resource this page must release is the one thing its
 * suite cannot check.
 */
function withRevokeSpy(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const had = 'revokeObjectURL' in URL;
  const previous = (URL as any).revokeObjectURL;
  (URL as any).revokeObjectURL = (u: string) => { calls.push(u); };
  return { calls, restore: () => { if (had) (URL as any).revokeObjectURL = previous; else delete (URL as any).revokeObjectURL; } };
}

const dir = (name: string, extra: Record<string, unknown> = {}) =>
  ({ name, isDirectory: true, size: 0, ...extra });
const file = (name: string, extra: Record<string, unknown> = {}) =>
  ({ name, isDirectory: false, size: 0, ...extra });

beforeEach(() => TestBed.resetTestingModule());

describe('FileManagerComponent — sorting (characterization for G-3)', () => {
  it('folders come before files whatever the column says', () => {
    /*
     * The rule that outranks the chosen column, and the reason is in the source: this is a file explorer, and
     * interleaving directories with files by size or date makes the tree unnavigable. A shared table-header
     * primitive would not know that, which is exactly why it is pinned here before the split.
     */
    const c = create();
    /*
     * The fixture has to make the two rules DISAGREE, or it proves nothing. The first version gave the folder
     * the larger size under a descending sort, so folders-first and size-desc wanted the same order and
     * deleting the folder rule left the test green. Here the folder is the smallest thing in the list while
     * the sort is descending, so only the folder rule can put it first.
     */
    c.entries.set([file('big-file', { size: 999 }), dir('folder', { size: 1 })]);
    c.sortField.set('size');
    c.sortDir.set('desc');
    expect(c.sortedEntries().map((e: any) => e.name)).toEqual(['folder', 'big-file']);
  });

  it('an unset field returns the server order untouched, not a name sort', () => {
    const c = create();
    c.entries.set([file('b'), file('a')]);
    c.sortField.set('');
    expect(c.sortedEntries().map((e: any) => e.name)).toEqual(['b', 'a']);
  });

  it('the third click on one column CLEARS the sort rather than cycling back to ascending', () => {
    // asc -> desc -> unsorted. A cycle that returned to `asc` would look identical for two clicks and then
    // quietly differ, which is the kind of thing a rewrite gets wrong without anyone noticing.
    const c = create();
    c.setSort('name');
    expect([c.sortField(), c.sortDir()]).toEqual(['name', 'asc']);
    c.setSort('name');
    expect([c.sortField(), c.sortDir()]).toEqual(['name', 'desc']);
    c.setSort('name');
    expect([c.sortField(), c.sortDir()]).toEqual(['', 'asc']);
  });

  it('switching column starts ascending from either previous direction', () => {
    const c = create();
    c.setSort('name');
    c.setSort('name');                       // now descending
    c.setSort('size');
    expect([c.sortField(), c.sortDir()]).toEqual(['size', 'asc']);
  });

  it('equal keys fall back to the name, so the order is stable rather than arbitrary', () => {
    const c = create();
    c.entries.set([file('beta', { size: 5 }), file('alpha', { size: 5 })]);
    c.sortField.set('size');
    c.sortDir.set('asc');
    expect(c.sortedEntries().map((e: any) => e.name)).toEqual(['alpha', 'beta']);
  });

  it('a missing size sorts as zero and a missing status as empty, rather than dropping the row', () => {
    // AS-IS. The rows are `?? 0` and `?? ''`, so an entry with no size is smallest and one with no status
    // sorts first ascending. What matters for the split is that it still APPEARS.
    const c = create();
    c.entries.set([file('sized', { size: 100 }), file('unsized')]);
    c.sortField.set('size');
    c.sortDir.set('asc');
    expect(c.sortedEntries().map((e: any) => e.name)).toEqual(['unsized', 'sized']);
  });

  it('sorting never mutates the entries signal', () => {
    // `[...list].sort()` — the copy is load-bearing, because `Array.sort` is in-place and a signal whose
    // value changed without a write is a bug that shows up somewhere else entirely.
    const c = create();
    const original = [file('b'), file('a')];
    c.entries.set(original);
    c.sortField.set('name');
    c.sortedEntries();
    expect(c.entries().map((e: any) => e.name)).toEqual(['b', 'a']);
  });
});

describe('FileManagerComponent — paths and breadcrumbs (characterization for G-3)', () => {
  it('join does not double a separator, and does not add one to a bare root', () => {
    const c = create();
    expect(c.join('/', 'a')).toBe('/a');
    expect(c.join('/a', 'b')).toBe('/a/b');
    expect(c.join('/a/', 'b')).toBe('/a/b');
  });

  it('the root crumb is always present, even at the root itself', () => {
    const c = create();
    c.updateBreadcrumbs('/');
    expect(c.breadcrumbs()).toEqual([{ label: 'root', path: '/' }]);
  });

  it('each crumb carries the path that leads to it, not just its own name', () => {
    // The crumbs are clickable, so a label without its accumulated path is a link to the wrong folder — and
    // the accumulation is the half a rewrite drops, because the labels look right either way.
    const c = create();
    c.updateBreadcrumbs('/docs/2026/q3');
    expect(c.breadcrumbs()).toEqual([
      { label: 'root', path: '/' },
      { label: 'docs', path: '/docs' },
      { label: '2026', path: '/docs/2026' },
      { label: 'q3', path: '/docs/2026/q3' },
    ]);
  });

  it('empty segments are dropped, so a doubled or trailing slash does not produce a blank crumb', () => {
    const c = create();
    c.updateBreadcrumbs('//docs//');
    expect(c.breadcrumbs().map((b: any) => b.label)).toEqual(['root', 'docs']);
  });
});

describe('FileManagerComponent — the preview object URL (characterization for G-3)', () => {
  it('closing the preview revokes the object URL and forgets it', () => {
    /*
     * A leak here is invisible: the blob stays alive for the life of the tab and nothing reports it. So is the
     * opposite mistake, revoking a URL still bound to an <img>, which shows as an image that silently fails to
     * load. Nothing else on this page owns a resource that must be released, which is why it is easy to drop
     * when the preview becomes its own component.
     */
    const spy = withRevokeSpy();
    const c = create();
    c._previewObjectUrl = 'blob:fake';
    c.closePreview();
    expect(spy.calls).toEqual(['blob:fake']);
    expect(c._previewObjectUrl).toBeNull();
    spy.restore();
  });

  it('closing twice revokes once — the second call has nothing to release', () => {
    const spy = withRevokeSpy();
    const c = create();
    c._previewObjectUrl = 'blob:fake';
    c.closePreview();
    c.closePreview();
    expect(spy.calls).toHaveLength(1);
    spy.restore();
  });

  it('closing with no preview open revokes nothing rather than throwing', () => {
    const spy = withRevokeSpy();
    const c = create();
    c._previewObjectUrl = null;
    expect(() => c.closePreview()).not.toThrow();
    expect(spy.calls).toEqual([]);
    spy.restore();
  });

  it('closing clears the open file as well as the URL', () => {
    const spy = withRevokeSpy();
    const c = create();
    c.previewFile.set(file('x'));
    c.closePreview();
    expect(c.previewFile()).toBeNull();
    spy.restore();
  });
});

describe('FileManagerComponent — the metadata edit model (characterization for G-3)', () => {
  it('seeds every field from the record, and entityIds as a COMMA-JOINED STRING', () => {
    /*
     * The asymmetry is the behaviour. `tags`, `memoryIds` and `chronoIds` stay arrays; `entityIds` becomes a
     * string because its control is a free-text field. A signal-based rewrite that made all four the same
     * shape would break the round-trip in one direction only, and only for entity references.
     */
    const c = create();
    c.seedMetaModel({ description: 'd', tags: ['t'], entityIds: ['e1', 'e2'], memoryIds: ['m'], chronoIds: ['c'] });
    expect(c.metaEditModel).toEqual({
      description: 'd', tags: ['t'], entityIds: 'e1, e2', memoryIds: ['m'], chronoIds: ['c'],
    });
  });

  it('a null record seeds empties rather than leaving the previous file\'s values', () => {
    // Opening a file with no meta record after one that had some is the case this protects: the drawer must
    // not show the last file's description.
    const c = create();
    c.seedMetaModel({ description: 'old', tags: ['x'], entityIds: ['e'], memoryIds: [], chronoIds: [] });
    c.seedMetaModel(null);
    expect(c.metaEditModel).toEqual({ description: '', tags: [], entityIds: '', memoryIds: [], chronoIds: [] });
  });

  it('the arrays are COPIED, so editing the form cannot reach back into the loaded record', () => {
    const c = create();
    const loaded = { description: '', tags: ['keep'], entityIds: [], memoryIds: [], chronoIds: [] };
    c.seedMetaModel(loaded);
    c.metaEditModel.tags.push('added');
    expect(loaded.tags).toEqual(['keep']);
  });

  it('cancelling re-seeds from the loaded record and drops the error', () => {
    const c = create();
    c.selectedMeta.set({ description: 'saved', tags: [], entityIds: [], memoryIds: [], chronoIds: [] });
    c.metaEditModel.description = 'typed but not saved';
    c.metaError.set('something went wrong');
    c.cancelMeta();
    expect(c.metaEditModel.description).toBe('saved');
    expect(c.metaError()).toBeNull();
    expect(c.detailMode()).toBe('preview');
  });

  it('opening the edit face re-seeds too, so a previous cancel cannot leak into it', () => {
    const c = create();
    c.selectedMeta.set({ description: 'saved', tags: [], entityIds: [], memoryIds: [], chronoIds: [] });
    c.metaEditModel.description = 'stale';
    c.showMetaMode();
    expect(c.metaEditModel.description).toBe('saved');
  });
});

describe('FileManagerComponent — formatSize (characterization for G-3)', () => {
  it('switches unit at each 1024 boundary, and the boundary belongs to the LARGER unit', () => {
    const c = create();
    expect(c.formatSize(1023)).toBe('1023 B');
    expect(c.formatSize(1024)).toBe('1.0 KB');
    expect(c.formatSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    expect(c.formatSize(1024 * 1024)).toBe('1.0 MB');
  });

  it('gives bytes no decimal, KB and MB one, and GB two', () => {
    // AS-IS, and it is a deliberate asymmetry rather than an oversight: a GB figure moves slowly enough that
    // one decimal would look stuck.
    const c = create();
    expect(c.formatSize(500)).toBe('500 B');
    expect(c.formatSize(1536)).toBe('1.5 KB');
    expect(c.formatSize(1024 * 1024 * 1024 * 2.5)).toBe('2.50 GB');
  });

  it('zero is bytes, not an empty string or a dash', () => {
    const c = create();
    expect(c.formatSize(0)).toBe('0 B');
  });
});
