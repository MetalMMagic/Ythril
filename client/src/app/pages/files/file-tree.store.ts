import { Injectable, inject, signal } from '@angular/core';
import { FilesApi } from '../../core/files-api.service';
import { joinPath } from './file-format';
import type { TreeNode } from './file-tree.component';
import type { FileEntry } from '../../core/api.types';

/** Where the sidebar's open/closed state is remembered between visits. */
const SIDEBAR_KEY = 'ythril.sidebar';

/**
 * The directory tree's state and its two requests.
 *
 * ## Why a store and not a component
 *
 * G-3's seventh cut, and the reason is the one the previous cut wrote down rather than a new one. The sidebar
 * renders inside an `@if (sidebarOpen())`, so `FileTreeComponent` is destroyed every time the sidebar is
 * closed — a component owning `listFiles` would cancel it on destroy and lose the loaded tree, and reopening
 * would re-fetch. A characterization case pins that reopening does NOT re-fetch.
 *
 * A store injected by the page has the page's lifetime, which is what the requests need, while taking them off
 * a file that is the largest in the repo. `providers: [FileTreeStore]` on the page, deliberately: instance per
 * page, not per application, because the tree belongs to the space the page is showing.
 *
 * ## The nodes are mutated IN PLACE, and every mutation must replace the array
 *
 * `node.expanded = false`, `node.children = [...]`, `node.loading = true` — the tree is a recursive structure
 * and rebuilding it immutably on every expand would lose the identity the component's `@for` tracks. The page
 * and the tree component are both `OnPush`, so a mutation alone marks nothing dirty; what redraws the view is
 * `treeRoot.set([...])`, a fresh reference and nothing else.
 *
 * Nothing in the code says that out loud, which is why it is said here and why `bump()` is the only way this
 * class writes the signal. A mutation followed by a forgotten `set` gives a tree that is correct in memory and
 * frozen on screen: no error, no warning, and the data inspector agrees with you.
 *
 * ## What it deliberately does NOT own
 *
 * Navigation. `onTreeClick` on the page calls `navigate(node.path)` and then `toggle(node)`, and those are two
 * separate effects of one gesture — a characterization case pins both. Folding navigation in here would make
 * this store decide what a click means, and it would also hide `G-10`: clicking a folder currently lists that
 * directory TWICE, once for the listing and once for the children, and the two calls being visible side by side
 * at the call site is what keeps that findable.
 */
@Injectable()
export class FileTreeStore {
  private filesApi = inject(FilesApi);

  /** The root nodes. Mutated in place by the methods below, and always re-set through `bump()`. */
  readonly treeRoot = signal<TreeNode[]>([]);

  /**
   * Remembered across visits, because a sidebar the operator closed should stay closed.
   *
   * Read at construction rather than in an effect: the template needs it on the first render, and an effect
   * would flash the tree open for one frame on a page whose owner had hidden it.
   */
  readonly sidebarOpen = signal(localStorage.getItem(SIDEBAR_KEY) !== 'closed');

  /** Hand Angular a new array reference. The ONLY place this signal is written — see the class docblock. */
  private bump(): void {
    this.treeRoot.set([...this.treeRoot()]);
  }

  /** Directories only — a tree of files is not a tree, and the filter is the whole of what makes it one. */
  private nodesFrom(entries: FileEntry[], base: string): TreeNode[] {
    return entries
      .filter(e => e.isDirectory)
      .map(e => ({ name: e.name, path: joinPath(base, e.name), expanded: false, loading: false, children: null }));
  }

  /**
   * Load the space's top-level directories.
   *
   * Swallows its error, as it always has: the tree is an aid to navigation and the listing beside it reports
   * the same failure for the same path. `G-10` covers giving the tree a failure state of its own, and notes
   * that the duplicate request is currently the only thing that surfaces one.
   */
  loadRoot(spaceId: string): void {
    if (!spaceId) return;
    this.filesApi.listFiles(spaceId, '/').subscribe({
      next: ({ entries }) => this.treeRoot.set(this.nodesFrom(entries, '/')),
      error: () => {},
    });
  }

  /**
   * Expand a collapsed node, or collapse an expanded one.
   *
   * **Collapsing keeps the loaded children**, so re-expanding costs no request. That is not an optimisation to
   * be tidied away later: a characterization case counts the requests, because rebuilding a node's children
   * from a fresh listing on every toggle is invisible on a fast network and shows up only as a slower click.
   */
  toggle(node: TreeNode, spaceId: string): void {
    if (node.expanded) {
      node.expanded = false;
      this.bump();
      return;
    }
    if (node.children !== null) {
      node.expanded = true;
      this.bump();
      return;
    }
    node.loading = true;
    this.bump();
    this.filesApi.listFiles(spaceId, node.path).subscribe({
      next: ({ entries }) => {
        node.children = this.nodesFrom(entries, node.path);
        node.loading = false;
        node.expanded = true;
        this.bump();
      },
      error: () => {
        // Spinner off, node left CLOSED and nothing said — pinned AS-IS, and `G-10` is where the failure state
        // it should have is specified.
        node.loading = false;
        this.bump();
      },
    });
  }

  /**
   * Show or hide the sidebar, and load the tree the first time it is shown.
   *
   * The load condition is a REQUEST decision rather than a UI one: reopening a sidebar whose tree is already
   * loaded must not re-fetch the root. That is why it lives with the tree and not with the toolbar button.
   */
  toggleSidebar(spaceId: string): void {
    const open = !this.sidebarOpen();
    this.sidebarOpen.set(open);
    localStorage.setItem(SIDEBAR_KEY, open ? 'open' : 'closed');
    if (open && this.treeRoot().length === 0) this.loadRoot(spaceId);
  }
}
