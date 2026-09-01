import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { PhIconComponent } from '../../shared/ph-icon.component';

/**
 * One node of the directory tree in the file manager's sidebar.
 *
 * `children: null` means **not fetched yet** and `[]` would mean **fetched, and there are none**. The
 * difference decides whether expanding issues a request at all, so a store that initialised children to `[]`
 * would give a tree whose folders can never be opened — with no error. Pinned in
 * `file-manager.characterization.spec.ts`.
 */
export interface TreeNode {
  name: string;
  path: string;
  expanded: boolean;
  loading: boolean;
  children: TreeNode[] | null;
}

/**
 * The directory tree in the file manager's sidebar — the markup and the styles, and nothing else.
 *
 * ## Why it left the page
 *
 * G-3: `file-manager.component.ts` is the largest file in the repo, and this was the biggest block its shell
 * still rendered inline — a recursive template, six CSS rules and an interface. The gate that froze the file
 * says why in its own message: *"every change lands in the same place because that is where the code already
 * is."*
 *
 * It was also the last part of that page with no assertion anywhere. Ten characterization cases went in first,
 * as their own change, and were proven green against the unrefactored page (#1114) — which is what makes this
 * cut checkable rather than hopeful. One of those cases exists because of the trap below.
 *
 * ## The nodes are mutated in place, and that is why the page hands over an ARRAY
 *
 * `node.expanded = false`, `node.children = [...]`, `node.loading = true` — every one of those mutates a node
 * the page already holds. The page is `OnPush`, so a mutation alone marks nothing dirty; what redraws the view
 * is `treeRoot.set([...treeRoot()])`, a fresh array reference. Nothing in the code says that out loud.
 *
 * So this component takes `[nodes]` and renders it. It does not copy, normalise or re-key them: a `@for` over a
 * mapped copy would break the identity the page's mutations rely on, and the symptom would be a tree that is
 * correct in memory and frozen on screen — no error, no warning.
 *
 * ## And why the requests stayed behind
 *
 * The sidebar lives inside an `@if (sidebarOpen())`, so this component is destroyed every time the sidebar is
 * closed. A component that owned the directory listing would cancel it on destroy and lose the loaded tree, so
 * reopening would re-fetch — one of the characterization cases pins that it does not. The page owns the
 * requests; this renders their result and reports clicks.
 */
@Component({
  selector: 'app-file-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  /*
   * `NgTemplateOutlet` is not optional and its absence is SILENT: a standalone component that does not import
   * it treats `*ngTemplateOutlet` as an unknown attribute, renders nothing, and raises no error. The tree came
   * out empty on the first run of this cut and the characterization case is what said so.
   */
  imports: [NgTemplateOutlet, TranslocoPipe, PhIconComponent],
  styles: [`
    /*
     * A block, stated. This was a div on the page and a div is display:block; a custom element is
     * display:inline, so the width, border and overflow below would apply to a shrink-wrapping box that still
     * renders — which is exactly how the upload panel came out wrong in an earlier cut of this same file.
     */
    :host {
      display: block;
      width: 220px;
      flex-shrink: 0;
      border-right: 1px solid var(--border);
      padding: 8px 0;
      overflow-y: auto;
      max-height: calc(100vh - 180px);
    }
    .tree-node {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-radius: 4px;
      margin: 0 4px;
    }
    .tree-node:hover { background: var(--bg-hover); }
    .tree-node.active { background: var(--accent-dim); color: var(--accent); font-weight: 500; }
    .tree-caret {
      width: 16px;
      text-align: center;
      flex-shrink: 0;
      font-size: 10px;
      color: var(--text-muted);
      transition: transform 0.15s;
    }
    .tree-caret.expanded { transform: rotate(90deg); }
    .tree-children { padding-left: 12px; }
    .tree-spinner { font-size: 10px; color: var(--text-muted); padding: 2px 8px 2px 28px; }
  `],
  template: `
    <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: nodes() }"></ng-container>

    <ng-template #treeTemplate let-list>
      @for (node of list; track node.path) {
        <div class="tree-node"
             [class.active]="currentPath() === node.path"
             (click)="nodeClick.emit(node)">
          <span class="tree-caret" [class.expanded]="node.expanded"><ph-icon name="caret-right" [size]="10"/></span>
          <span><ph-icon name="folder" [size]="14"/> {{ node.name }}</span>
        </div>
        @if (node.loading) {
          <div class="tree-spinner">{{ 'files.tree.loading' | transloco }}</div>
        }
        @if (node.expanded && node.children) {
          <div class="tree-children">
            <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: node.children }"></ng-container>
          </div>
        }
      }
    </ng-template>
  `,
})
export class FileTreeComponent {
  /** The page's own array, by reference. See the docblock: a copy would break its in-place mutations. */
  nodes = input.required<TreeNode[]>();
  currentPath = input('');

  /**
   * One output for one gesture, and the page does two things with it: navigate, and expand or collapse.
   *
   * Split into `navigate` and `toggle` this component would be deciding which a click means, and a
   * characterization case pins that a single click does both.
   */
  nodeClick = output<TreeNode>();
}
