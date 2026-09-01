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
import { of, throwError } from 'rxjs';
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

/*
 * The `formatSize` block moved to `file-format.spec.ts` when it became a shared function.
 *
 * It was reaching through the page for six lines of arithmetic, and the page kept a named handle on the
 * function ONLY so this could find it. That is the trap `file-format.spec.ts`'s own docblock describes and the
 * one G-7 removed twice — a spec that reaches through a component keeps passing after the component stops
 * using the thing, so the coverage reads as protection for code nobody can reach.
 *
 * The boundary cases are unchanged there, plus the ones that were awkward to assert from a component.
 */

/**
 * The tree sidebar — characterization, and the last uncovered seam in this page.
 *
 * ## Why it gets its own block, written before the cut rather than after
 *
 * G-3's remaining work is the shell, and the tree is the largest thing the shell still renders inline: a
 * recursive template, five CSS rules, an interface, a signal and three methods. It is also the ONLY part of
 * this page with no assertion anywhere — the blocks above pin sorting, paths, the object URL and the metadata
 * model, and the tree is not mentioned in any of them.
 *
 * That combination is what the repo rule is about: weak coverage plus a refactor means characterization tests
 * first, proven green against the ORIGINAL code, as their own change. Every one of these cases passed before a
 * line of the extraction was written.
 *
 * ## What is actually fragile here
 *
 * The tree's nodes are MUTATED IN PLACE — `node.expanded = false`, `node.children = [...]`, `node.loading =
 * true` — and the page is `OnPush`. So every mutation is followed by `treeRoot.set([...treeRoot()])`, whose
 * only purpose is to hand Angular a new array reference so the view is marked dirty. Nothing about the code
 * says that out loud, and an extraction that moves this into a store with immutable updates, or that drops one
 * spread, produces a tree which silently never redraws. There is no error, no console warning: the data is
 * right and the screen is stale.
 *
 * The other fragile part is quieter. Collapsing a node does not discard its loaded children, so re-expanding
 * costs no request — and an extraction that rebuilds nodes from a fresh listing would re-fetch every time, on
 * a page where the request is invisible and the only symptom is a slower click.
 */
describe('FileManagerComponent — the tree sidebar (characterization for G-3)', () => {
  /** A fixture whose directory listings are scriptable per path, so an expand can be driven. */
  function createWithTree(listing: Record<string, unknown[]>) {
    const requested: string[] = [];
    const api = {
      ...makeApi(),
      listFiles: (_space: string, path: string) => {
        requested.push(path);
        return of({ entries: listing[path] ?? [], path });
      },
    } as any;
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: api },
        { provide: SpacesApi, useValue: api },
        { provide: BrainApi, useValue: api },
        { provide: AuthService, useValue: { token: () => 't' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } }, queryParamMap: of() } },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    fixture.detectChanges();
    return { c: fixture.componentInstance as any, fixture, requested };
  }

  it('the root holds directories only — a file is not a tree node', () => {
    /*
     * The filter is one `.filter(e => e.isDirectory)` inside the subscribe, and it is the whole reason the tree
     * is a tree. Losing it puts every file in the space into the sidebar, which looks like a listing bug rather
     * than a tree bug and would be blamed on the wrong component.
     */
    const { c } = createWithTree({ '/': [dir('docs'), file('a.txt'), dir('img')] });
    expect(c.treeRoot().map((n: any) => n.name)).toEqual(['docs', 'img']);
  });

  it('a root node starts collapsed with children UNLOADED, which is not the same as empty', () => {
    /*
     * `children: null` means "not fetched yet" and `[]` would mean "fetched, and there are none". The
     * difference decides whether expanding issues a request, so a store that initialised children to `[]`
     * would give a tree whose folders can never be opened — and no error.
     */
    const { c } = createWithTree({ '/': [dir('docs')] });
    const node = c.treeRoot()[0];
    expect(node.expanded).toBe(false);
    expect(node.loading).toBe(false);
    expect(node.children).toBeNull();
  });

  it('a node path is built with the page join, so it matches what the breadcrumb produces', () => {
    // The docblock at the top of this file already names this: `join` and the breadcrumb accumulator are the
    // only two places that build a path, and a tree with its own copy is how they start to disagree.
    const { c } = createWithTree({ '/': [dir('docs')] });
    expect(c.treeRoot()[0].path).toBe(c.join('/', 'docs'));
  });

  it('AS-IS: one click on a folder lists that directory TWICE', () => {
    /*
     * Found by writing this assertion expecting 1. `onTreeClick` calls `navigate(path)`, which loads the
     * directory for the main listing, and then `expandTreeNode(node)`, which lists the same path again for the
     * tree's children. Same URL, same moment, two requests — every time a folder is opened from the sidebar.
     *
     * Pinned AS-IS at two rather than quietly asserted as one, because a characterization test's job is to
     * record what happens. Filed as `G-10`: the second request is avoidable (the listing already holds the
     * directories) but de-duplicating it is a behaviour change and does not belong inside a file split.
     *
     * It also has to be pinned so the extraction cannot make it WORSE without anyone noticing — a tree
     * component that fetched on its own would make it three.
     */
    const { c, requested } = createWithTree({ '/': [dir('docs')], '/docs': [dir('api'), file('note.md')] });
    c.onTreeClick(c.treeRoot()[0]);
    const node = c.treeRoot()[0];
    expect(node.expanded).toBe(true);
    expect(node.children.map((n: any) => n.name)).toEqual(['api']);
    expect(requested.filter(p => p === '/docs').length).toBe(2);
  });

  it('every mutation replaces the ARRAY, because the page is OnPush', () => {
    /*
     * The assertion this whole block exists for. Nodes are mutated in place, so the signal's value is the same
     * objects every time — only a fresh array reference marks the view dirty. An extraction that keeps the
     * mutation and drops the spread leaves a tree that is correct in memory and frozen on screen.
     *
     * Asserted as reference INEQUALITY rather than by reading the rendered DOM, because the DOM is what would
     * silently agree: a stale view renders the previous state perfectly well.
     */
    const { c } = createWithTree({ '/': [dir('docs')], '/docs': [dir('api')] });
    const before = c.treeRoot();
    c.onTreeClick(before[0]);
    expect(c.treeRoot()).not.toBe(before);
  });

  it('collapsing keeps the loaded children, so re-expanding costs no request', () => {
    /*
     * `onTreeClick` on an expanded node sets `expanded = false` and nothing else. The children stay, which is
     * why the second expand is free — and why an extraction that rebuilds nodes from a fresh listing would
     * re-request on every toggle. Invisible on a fast network and the only symptom is a slower click.
     */
    const { c, requested } = createWithTree({ '/': [dir('docs')], '/docs': [dir('api')] });
    c.onTreeClick(c.treeRoot()[0]);
    expect(requested.filter(p => p === '/docs').length).toBe(2);   // the duplicate above

    c.onTreeClick(c.treeRoot()[0]);
    expect(c.treeRoot()[0].expanded).toBe(false);
    expect(c.treeRoot()[0].children.map((n: any) => n.name)).toEqual(['api']);

    c.onTreeClick(c.treeRoot()[0]);
    expect(c.treeRoot()[0].expanded).toBe(true);
    /*
     * Three clicks, four requests — and the arithmetic is the assertion. Each click costs the listing's one
     * (via `navigate`), and only the FIRST costs the tree's: the collapse and the re-expand both find
     * `children` already there and issue nothing. So the caching is real, and it is worth exactly one request
     * per toggle rather than the two a rebuild-from-scratch tree would pay.
     */
    expect(requested.filter(p => p === '/docs').length).toBe(4);
  });

  it('clicking a node NAVIGATES as well as toggling — one gesture, two effects', () => {
    /*
     * Easy to lose in a split, because a presentational tree component naturally emits one event and the page
     * naturally handles one thing with it. Both halves are the behaviour: the listing follows the tree.
     */
    const { c } = createWithTree({ '/': [dir('docs')], '/docs': [] });
    c.onTreeClick(c.treeRoot()[0]);
    expect(c.currentPath()).toBe('/docs');
    expect(c.breadcrumbs().map((b: any) => b.name ?? b.label ?? b)).toContain('docs');
  });

  it('AS-IS: a failed expand clears the spinner and leaves the node closed, silently', () => {
    /*
     * Marked AS-IS because it is arguably a defect rather than a decision: the error branch resets `loading`
     * and does NOT set `expanded`, so the caret springs back and nothing anywhere says why. Every other load on
     * this page has a visible failure state — `loadError`, `refreshFailed`, `spacesError`.
     *
     * Pinned exactly as it behaves so the extraction cannot change it by accident. Improving it is a deliberate
     * edit to this assertion, which is the point of the convention.
     */
    const api = {
      ...makeApi(),
      listFiles: (_s: string, path: string) =>
        (path === '/docs' ? throwError(() => new Error('nope')) : of({ entries: [dir('docs')], path })),
    } as any;
    TestBed.configureTestingModule({
      imports: [FileManagerComponent, getTranslocoModule()],
      providers: [
        { provide: FilesApi, useValue: api },
        { provide: SpacesApi, useValue: api },
        { provide: BrainApi, useValue: api },
        { provide: AuthService, useValue: { token: () => 't' } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } }, queryParamMap: of() } },
      ],
    });
    const fixture = TestBed.createComponent(FileManagerComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;

    c.onTreeClick(c.treeRoot()[0]);
    expect(c.treeRoot()[0].loading).toBe(false);
    expect(c.treeRoot()[0].expanded).toBe(false);
    expect(c.treeRoot()[0].children).toBeNull();
    /*
     * `loadError` IS set here — not by the tree, but by the main listing, which requested the same failing path
     * through `navigate`. So today an operator does see something, by accident: the duplicate request is what
     * puts the error into the listing, and the tree itself shows nothing.
     *
     * That is worth knowing before either of the two fixes. De-duplicating the request (`G-10`) removes the
     * accidental message along with it, and giving the tree its own error state has to come first or the
     * failure becomes genuinely silent.
     */
    expect(c.loadError()).toBeTruthy();
  });

  it('the sidebar remembers being closed, and loads the tree only when it has none', () => {
    /*
     * Two behaviours in one method, and the second is a request decision rather than a UI one: reopening a
     * sidebar whose tree is already loaded must not re-fetch the root. That is why this belongs with the tree
     * and not with the toolbar.
     */
    const { c, requested } = createWithTree({ '/': [dir('docs')] });
    const rootsAtStart = requested.filter(p => p === '/').length;

    c.toggleSidebar();
    expect(c.sidebarOpen()).toBe(false);
    expect(localStorage.getItem('ythril.sidebar')).toBe('closed');

    c.toggleSidebar();
    expect(c.sidebarOpen()).toBe(true);
    expect(localStorage.getItem('ythril.sidebar')).toBe('open');
    expect(requested.filter(p => p === '/').length).toBe(rootsAtStart);
  });

  it('switching space rebuilds the tree from the new space root', () => {
    // The tree is per-space state, and `selectSpace` is the only thing that resets it. A store whose lifetime
    // outlived the selection would show the previous space's folders.
    const { c, requested } = createWithTree({ '/': [dir('docs')] });
    const before = requested.filter(p => p === '/').length;
    c.selectSpace('work');
    expect(requested.filter(p => p === '/').length).toBeGreaterThan(before);
    expect(c.currentPath()).toBe('/');
  });
});
