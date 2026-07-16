import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy, HostListener, ElementRef, viewChild, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Space, FileEntry, UploadProgress } from '../../core/api.types';
import { FilesApi } from '../../core/files-api.service';
import { SpacesApi } from '../../core/spaces-api.service';
import { AuthService } from '../../core/auth.service';
import { PhIconComponent } from '../../shared/ph-icon.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog.service';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { httpErrorReason } from '../../core/http-error';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import plaintext from 'highlight.js/lib/languages/plaintext';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('plaintext', plaintext);

interface BreadcrumbSegment { label: string; path: string; }

interface TreeNode {
  name: string;
  path: string;
  expanded: boolean;
  loading: boolean;
  children: TreeNode[] | null;  // null = not yet loaded
}

type PreviewKind = 'text' | 'image' | 'pdf' | 'unknown';

type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed';

/** One row in the upload panel — a single file's lifecycle (U12). */
interface UploadItem {
  id: number;
  file: File;
  name: string;
  status: UploadStatus;
  percent: number;
  error?: string;
}

const TEXT_EXTS = new Set([
  '.txt', '.md', '.json', '.yaml', '.yml', '.ts', '.js', '.py', '.sh',
  '.csv', '.xml', '.html', '.css', '.log', '.env', '.toml',
]);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const PDF_EXTS = new Set(['.pdf']);

const EXT_LANG: Record<string, string> = {
  '.js': 'javascript', '.ts': 'typescript', '.json': 'json',
  '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml', '.html': 'xml',
  '.css': 'css', '.md': 'markdown', '.py': 'python',
  '.sh': 'bash', '.bash': 'bash',
};

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i).toLowerCase() : '';
}

function previewKind(name: string): PreviewKind {
  const ext = extOf(name);
  if (TEXT_EXTS.has(ext)) return 'text';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (PDF_EXTS.has(ext)) return 'pdf';
  return 'unknown';
}

@Component({
  selector: 'app-file-manager',
  standalone: true,
  // OnPush (P5): all rendered state is signal-backed (`entries`, `treeRoot`, `breadcrumbs`,
  // `previewFile`/`previewHtml`, upload progress, …). Every tree expansion mutates a node in place
  // but always follows with `treeRoot.set([...])` — a fresh reference that marks the view dirty —
  // and the async preview/upload callbacks update via signal `.set()`, which notifies OnPush
  // regardless of zone. Text fields (`newFolderName`, `renameValue`) are ngModel two-way bindings
  // whose input events mark the view dirty. So OnPush re-checks exactly when state changes.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PhIconComponent, TranslocoPipe, ErrorStateComponent],
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      flex: 1;
      flex-wrap: wrap;
    }

    .breadcrumb-sep { color: var(--text-muted); }

    .breadcrumb-item {
      color: var(--accent);
      cursor: pointer;
      border: none;
      background: none;
      font-size: 13px;
      font-family: var(--font);
      padding: 0;
    }
    .breadcrumb-item:hover { text-decoration: underline; }
    .breadcrumb-item.current { color: var(--text-primary); cursor: default; }
    .breadcrumb-item.current:hover { text-decoration: none; }

    .file-icon { width: 20px; text-align: center; flex-shrink: 0; }

    .file-name-btn {
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      font-size: 13px;
      font-family: var(--font);
      text-align: left;
      padding: 0;
    }
    .file-name-btn.dir { color: var(--info); font-weight: 500; }
    .file-name-btn:hover { text-decoration: underline; }

    .upload-zone {
      border: 2px dashed var(--border);
      border-radius: var(--radius-md);
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      margin-bottom: 16px;
      transition: border-color var(--transition);
      cursor: pointer;
    }
    .upload-zone:hover, .upload-zone.drag-over {
      border-color: var(--accent);
      color: var(--text-secondary);
    }

    /* ── Upload queue panel (U12) ─────────────────────────────── */
    .upload-panel {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      margin-bottom: 16px;
      overflow: hidden;
    }
    .upload-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
    }
    .upload-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
    }
    .upload-row + .upload-row { border-top: 1px solid var(--border); }
    .upload-row-icon { flex-shrink: 0; color: var(--text-secondary); }
    .upload-row.done .upload-row-icon { color: var(--success); }
    .upload-row.failed .upload-row-icon { color: var(--error); }
    .upload-row-body { flex: 1; min-width: 0; }
    .upload-row-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
    }
    .upload-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }
    .upload-state {
      flex-shrink: 0;
      font-size: 12px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    .upload-row.failed .upload-state { color: var(--error); }
    .upload-bar {
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 6px;
    }
    .upload-bar-fill {
      height: 100%;
      background: var(--accent);
      transition: width 0.2s;
    }
    .upload-row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .rename-form { display: flex; gap: 6px; align-items: center; }

    .space-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    /* ── Preview pane ─────────────────────────────────────────── */
    .preview-overlay {
      position: fixed;
      inset: 0;
      background: var(--bg-scrim);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }
    .preview-pane {
      width: min(700px, 90vw);
      height: 100vh;
      background: var(--bg-surface);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: var(--shadow-drawer);
    }
    .preview-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .preview-header .file-title { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-body {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }
    .preview-body img {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
    }
    .preview-body iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .preview-code {
      background: var(--bg-muted);
      border-radius: 6px;
      padding: 16px;
      overflow: auto;
      font-family: var(--font-mono, monospace);
      font-size: 0.85em;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .preview-code code { background: none; }
    .preview-meta { display: grid; grid-template-columns: 100px 1fr; gap: 6px 12px; }
    .preview-meta dt { color: var(--text-muted); font-weight: 500; }
    .preview-meta dd { margin: 0; }

    /* ── Sidebar + layout ─────────────────────────────────────── */
    .fm-layout {
      display: flex;
      gap: 0;
    }
    .fm-sidebar {
      width: 220px;
      flex-shrink: 0;
      border-right: 1px solid var(--border);
      padding: 8px 0;
      overflow-y: auto;
      max-height: calc(100vh - 180px);
    }
    .fm-main { flex: 1; min-width: 0; }
    .sidebar-toggle {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-left: auto;
    }
    .sidebar-toggle:hover { background: var(--bg-hover); }

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
    @if (loadingSpaces()) {
      <div class="loading-overlay"><span class="spinner"></span></div>
    } @else {

      <!-- Space selector (hidden when embedded) -->
      @if (!embeddedSpaceId) {
      <div class="space-selector">
        @for (s of spaces(); track s.id) {
          <button
            class="btn"
            [class.btn-primary]="activeSpaceId() === s.id"
            [class.btn-secondary]="activeSpaceId() !== s.id"
            (click)="selectSpace(s.id)"
          >{{ s.label }}</button>
        }
      </div>
      }

      @if (activeSpaceId()) {
        <!-- Toolbar -->
        <div class="toolbar">
          <div class="breadcrumb">
            @for (seg of breadcrumbs(); track seg.path; let last = $last) {
              <button
                class="breadcrumb-item"
                [class.current]="last"
                (click)="navigate(seg.path)"
              >{{ seg.label }}</button>
              @if (!last) { <span class="breadcrumb-sep">/</span> }
            }
          </div>

          <!-- New folder -->
          @if (!showNewFolder()) {
            <button class="btn-secondary btn btn-sm" (click)="showNewFolder.set(true)">{{ 'files.newFolder' | transloco }}</button>
          } @else {
            <form class="rename-form" (ngSubmit)="createFolder()">
              <input type="text" [(ngModel)]="newFolderName" name="fn" [placeholder]="'files.newFolderPlaceholder' | transloco" [attr.aria-label]="'files.newFolderAriaLabel' | transloco" style="width:160px" />
              <button class="btn-primary btn btn-sm" type="submit">{{ 'files.createFolder' | transloco }}</button>
              <button class="btn-ghost btn btn-sm" type="button" (click)="showNewFolder.set(false)">{{ 'common.cancel' | transloco }}</button>
            </form>
          }

          <!-- Upload -->
          <label class="btn-secondary btn btn-sm" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            <ph-icon name="upload" [size]="14"/> {{ 'files.upload' | transloco }}
            <input type="file" multiple hidden (change)="onFileInput($event)" />
          </label>

          <button class="sidebar-toggle" (click)="toggleSidebar()">
            @if (sidebarOpen()) { <ph-icon name="caret-left" [size]="12"/> {{ 'files.sidebar.hideTree' | transloco }} }
            @else { <ph-icon name="caret-right" [size]="12"/> {{ 'files.sidebar.showTree' | transloco }} }
          </button>
        </div>

        <!-- Upload queue — one row per file (U12) -->
        @if (uploads().length) {
          <div class="upload-panel">
            <div class="upload-panel-head">
              <span>{{ 'files.upload.queueTitle' | transloco }}</span>
              @if (hasFinishedUploads()) {
                <button class="btn-ghost btn btn-sm" type="button" (click)="clearFinishedUploads()">
                  {{ 'files.upload.clearFinished' | transloco }}
                </button>
              }
            </div>
            @for (u of uploads(); track u.id) {
              <div class="upload-row" [class.failed]="u.status === 'failed'" [class.done]="u.status === 'done'">
                <ph-icon class="upload-row-icon" [name]="uploadIcon(u.status)" [size]="14"/>
                <div class="upload-row-body">
                  <div class="upload-row-top">
                    <span class="upload-name" [title]="u.name">{{ u.name }}</span>
                    <span class="upload-state">
                      @switch (u.status) {
                        @case ('queued') { {{ 'files.upload.status.queued' | transloco }} }
                        @case ('uploading') { {{ u.percent }}% }
                        @case ('done') { {{ 'files.upload.status.done' | transloco }} }
                        @case ('failed') { {{ u.error || ('files.upload.status.failed' | transloco) }} }
                      }
                    </span>
                  </div>
                  @if (u.status === 'uploading' || u.status === 'queued') {
                    <div class="upload-bar">
                      <div class="upload-bar-fill" [style.width.%]="u.percent"></div>
                    </div>
                  }
                </div>
                <div class="upload-row-actions">
                  @if (u.status === 'failed') {
                    <button class="btn-ghost btn btn-sm" type="button" (click)="retryUpload(u)">{{ 'common.retry' | transloco }}</button>
                  }
                  @if (u.status === 'queued' || u.status === 'uploading') {
                    <button class="btn-ghost btn btn-sm" type="button" (click)="cancelUpload(u)">{{ 'common.cancel' | transloco }}</button>
                  }
                  @if (u.status === 'done' || u.status === 'failed') {
                    <button class="icon-btn" type="button" [attr.aria-label]="'files.upload.dismiss' | transloco" (click)="dismissUpload(u)">
                      <ph-icon name="x" [size]="12"/>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

        <div class="fm-layout">
          <!-- Directory tree sidebar -->
          @if (sidebarOpen()) {
            <div class="fm-sidebar">
              <ng-container *ngTemplateOutlet="treeTemplate; context: { $implicit: treeRoot() }"></ng-container>
            </div>
          }

          <!-- Main file listing -->
          <div class="fm-main" [class.drag-over]="dragOver()">
            @if (loading()) {
              <div class="loading-overlay"><span class="spinner"></span></div>
            } @else {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width:24px"></th>
                  <th>{{ 'files.table.name' | transloco }}</th>
                  <th>{{ 'files.table.size' | transloco }}</th>
                  <th>{{ 'files.table.modified' | transloco }}</th>
                  <th>{{ 'files.table.actions' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track entry.name) {
                  <tr>
                    <td><span class="file-icon">@if (entry.isDirectory) { <ph-icon name="folder" [size]="16"/> } @else { <ph-icon name="file" [size]="16"/> }</span></td>
                    <td>
                      @if (renamingEntry() === entry.name) {
                        <form class="rename-form" (ngSubmit)="confirmRename(entry)">
                          <input type="text" [(ngModel)]="renameValue" name="rn" [attr.aria-label]="'files.renameEntryAriaLabel' | transloco" style="width:200px" />
                          <button class="btn-primary btn btn-sm" type="submit">{{ 'common.save' | transloco }}</button>
                          <button class="btn-ghost btn btn-sm" type="button" (click)="renamingEntry.set('')">{{ 'common.cancel' | transloco }}</button>
                        </form>
                      } @else {
                        <button
                          class="file-name-btn"
                          [class.dir]="entry.isDirectory"
                          (click)="open(entry)"
                        >{{ entry.name }}</button>
                      }
                    </td>
                    <td style="color:var(--text-muted)">
                      {{ entry.isDirectory ? '—' : formatSize(entry.size) }}
                    </td>
                    <td style="color:var(--text-muted)">{{ entry.modified | date:'dd.MM.yyyy HH:mm' }}</td>
                    <td style="display:flex; gap:6px; align-items:center;">
                      @if (entry.isFile) {
                        <button class="btn-ghost btn btn-sm" (click)="openPreview(entry)" [attr.aria-label]="'files.previewAriaLabel' | transloco" [attr.title]="'files.previewTitle' | transloco"><ph-icon name="eye" [size]="16"/></button>
                        <button
                          type="button"
                          class="btn-ghost btn btn-sm"
                          (click)="downloadFile(entry)"
                          [attr.aria-label]="'files.downloadAriaLabel' | transloco"
                        ><ph-icon name="download-simple" [size]="16"/></button>
                      }
                      <button class="btn-ghost btn btn-sm" (click)="startRename(entry)">{{ 'files.rename' | transloco }}</button>
                      <button class="icon-btn danger" (click)="deleteEntry(entry)" [attr.aria-label]="'files.deleteEntryAriaLabel' | transloco"><ph-icon name="x" [size]="16"/></button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5">
                    @if (loadError() !== null) {
                      <app-error-state [message]="'files.error.loadFiles' | transloco" [reason]="loadError() ?? ''" (retry)="reloadDir()" />
                    } @else {
                    <div class="empty-state" style="padding:32px">
                      <div class="empty-state-icon"><ph-icon name="folder-open" [size]="48"/></div>
                      <h3>{{ 'files.emptyFolder.title' | transloco }}</h3>
                      <p>{{ 'files.emptyFolder.body' | transloco }}</p>
                    </div>
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </div>
        }
          </div><!-- .fm-main -->
        </div><!-- .fm-layout -->
      }
    }

    <!-- Recursive tree template -->
    <ng-template #treeTemplate let-nodes>
      @for (node of nodes; track node.path) {
        <div class="tree-node"
             [class.active]="currentPath() === node.path"
             (click)="onTreeClick(node)">
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

    <!-- Preview pane -->
    @if (previewFile(); as pf) {
      <div class="preview-overlay" (click)="closePreview()" (keydown)="onPreviewKey($event)" tabindex="0" #previewOverlay>
        <div class="preview-pane" (click)="$event.stopPropagation()">
          <div class="preview-header">
            <span class="file-title" [title]="pf.name">{{ pf.name }}</span>
            <button type="button" class="btn-secondary btn btn-sm" (click)="downloadFile(pf)" style="display:inline-flex;align-items:center;gap:4px"><ph-icon name="download-simple" [size]="14"/> {{ 'files.download' | transloco }}</button>
            @if (embeddedSpaceId) {
              <button class="btn btn-sm btn-secondary" [attr.title]="'files.viewMetadataTitle' | transloco" (click)="viewFileMeta.emit(previewFilePath(pf))" style="display:inline-flex;align-items:center;gap:4px"><ph-icon name="tag" [size]="14"/> {{ 'files.viewMetadata' | transloco }}</button>
            }
            <button class="icon-btn" (click)="closePreview()" [attr.aria-label]="'files.closePreviewAriaLabel' | transloco"><ph-icon name="x" [size]="16"/></button>
          </div>
          <div class="preview-body">
            @if (previewLoading()) {
              <div class="loading-overlay"><span class="spinner"></span></div>
            } @else if (previewError() !== null) {
              <div class="alert alert-error" role="alert">{{ 'files.preview.failed' | transloco }} {{ previewError() }}</div>
            } @else {
            @switch (previewKind()) {
              @case ('text') {
                <pre class="preview-code"><code [innerHTML]="previewHtml()"></code></pre>
              }
              @case ('image') {
                <img [src]="previewMediaUrl()" [alt]="pf.name" />
              }
              @case ('pdf') {
                <iframe [src]="previewSafeUrl()"></iframe>
              }
              @default {
                <dl class="preview-meta">
                  <dt>{{ 'files.preview.name' | transloco }}</dt><dd>{{ pf.name }}</dd>
                  <dt>{{ 'files.preview.size' | transloco }}</dt><dd>{{ formatSize(pf.size) }}</dd>
                  <dt>{{ 'files.preview.modified' | transloco }}</dt><dd>{{ pf.modified | date:'dd.MM.yyyy HH:mm' }}</dd>
                </dl>
              }
            }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class FileManagerComponent implements OnInit, OnDestroy {
  private filesApi = inject(FilesApi);
  private spacesApi = inject(SpacesApi);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private transloco = inject(TranslocoService);
  private toast = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private previewOverlayRef = viewChild<ElementRef<HTMLDivElement>>('previewOverlay');

  /** When set (embedded in brain), skip space loading and use this space. */
  @Input() embeddedSpaceId = '';

  /** Emits the file path when user clicks "View Brain Metadata" in the preview pane. */
  @Output() viewFileMeta = new EventEmitter<string>();
  @Output() fileDeleted = new EventEmitter<void>();

  /** Navigate to the given directory when changed from parent (used by Brain filemeta→Files link). */
  @Input() set navigatePath(p: string) {
    if (p && this.activeSpaceId()) {
      this.navigate(p);
    }
  }

  spaces = signal<Space[]>([]);
  activeSpaceId = signal('');
  currentPath = signal('/');
  entries = signal<FileEntry[]>([]);
  loading = signal(false);
  /** Failure reason for the directory listing; null when it loaded (U3). */
  loadError = signal<string | null>(null);
  loadingSpaces = signal(true);

  // ── Upload queue (U12) ─────────────────────────────────────────────────────
  // One row per file, each with its own status/percent. Files upload one at a
  // time; the rest sit `queued`. A failed row can be retried, and a queued or
  // in-flight row can be cancelled (the latter aborts the in-flight chunk).
  uploads = signal<UploadItem[]>([]);
  /** Subscriptions for active uploads, by item id — unsubscribing cancels. */
  private uploadSubs = new Map<number, Subscription>();
  private uploadSeq = 0;
  /** True while an item is mid-flight — serialises the queue. */
  private processing = false;

  dragOver = signal(false);

  showNewFolder = signal(false);
  newFolderName = '';

  renamingEntry = signal('');
  renameValue = '';

  breadcrumbs = signal<BreadcrumbSegment[]>([{ label: 'root', path: '/' }]);

  // ── Preview state ────────────────────────────────────────────────────────
  previewFile = signal<FileEntry | null>(null);
  previewKind = signal<PreviewKind>('unknown');
  previewHtml = signal('');
  previewLoading = signal(false);
  previewMediaUrl = signal('');
  previewSafeUrl = signal<SafeResourceUrl>('');
  /** Set when preview fetch fails (e.g. auth/404) so we show a reason, not a blank pane. */
  previewError = signal<string | null>(null);
  /** Blob object URL backing the current image/PDF preview; revoked on close/next. */
  private _previewObjectUrl: string | null = null;

  // ── Tree sidebar state ───────────────────────────────────────────────────
  sidebarOpen = signal(localStorage.getItem('ythril.sidebar') !== 'closed');
  treeRoot = signal<TreeNode[]>([]);

  private _keyHandler = (e: KeyboardEvent) => this.onPreviewKey(e);

  ngOnInit(): void {
    if (this.embeddedSpaceId) {
      // Embedded in brain — use the provided space directly
      this.loadingSpaces.set(false);
      this.selectSpace(this.embeddedSpaceId);
      return;
    }
    const requestedSpace = this.route.snapshot.queryParamMap.get('space') ?? '';
    this.spacesApi.listSpaces().subscribe({
      next: ({ spaces }) => {
        this.spaces.set(spaces);
        this.loadingSpaces.set(false);
        if (spaces.length > 0) {
          const target = requestedSpace
            ? (spaces.find(s => s.id === requestedSpace) ?? spaces[0])
            : spaces[0];
          this.selectSpace(target.id);
        }
      },
      error: () => this.loadingSpaces.set(false),
    });
  }

  selectSpace(id: string): void {
    this.activeSpaceId.set(id);
    this.currentPath.set('/');
    this.updateBreadcrumbs('/');
    this.loadDir('/');
    this.loadTreeRoot();
  }

  navigate(path: string): void {
    this.currentPath.set(path);
    this.updateBreadcrumbs(path);
    this.loadDir(path);
  }

  open(entry: FileEntry): void {
    if (entry.isDirectory) {
      const next = this.join(this.currentPath(), entry.name);
      this.navigate(next);
    } else {
      this.openPreview(entry);
    }
  }

  private loadDir(path: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.filesApi.listFiles(this.activeSpaceId(), path).subscribe({
      next: ({ entries }) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      // A failed listing must not fall through to the "empty folder" state (U3).
      error: (e) => { this.loadError.set(httpErrorReason(e)); this.loading.set(false); },
    });
  }

  /** Re-load the current directory — bound to the error state's Retry button. */
  reloadDir(): void { this.loadDir(this.currentPath()); }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    // Only clear when leaving the component boundary
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      this.dragOver.set(false);
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    this.enqueueUploads(files);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    this.enqueueUploads(files);
    input.value = '';
  }

  // ── Upload queue (U12) ──────────────────────────────────────────────────────

  /** Add the picked/dropped files as queued rows and kick the processor. */
  private enqueueUploads(files: FileList): void {
    const items: UploadItem[] = Array.from(files).map(file => ({
      id: ++this.uploadSeq,
      file,
      name: file.name,
      status: 'queued' as const,
      percent: 0,
    }));
    this.uploads.update(u => [...u, ...items]);
    this.processQueue();
  }

  /** Immutably patch one upload row so the OnPush view re-renders. */
  private patchUpload(id: number, patch: Partial<UploadItem>): void {
    this.uploads.update(list => list.map(u => (u.id === id ? { ...u, ...patch } : u)));
  }

  /** Start the next queued upload, unless one is already in flight. */
  private processQueue(): void {
    if (this.processing) return;
    const next = this.uploads().find(u => u.status === 'queued');
    if (!next) return;
    this.processing = true;
    this.startUpload(next);
  }

  private startUpload(item: UploadItem): void {
    this.patchUpload(item.id, { status: 'uploading', percent: 0, error: undefined });
    const sub = this.filesApi
      .uploadFileChunked(this.activeSpaceId(), this.currentPath(), item.file)
      .subscribe({
        next: (progress) => this.patchUpload(item.id, { percent: progress.percent }),
        error: (err) => {
          this.uploadSubs.delete(item.id);
          this.patchUpload(item.id, { status: 'failed', error: httpErrorReason(err) || undefined });
          this.processing = false;
          this.processQueue();
        },
        complete: () => {
          this.uploadSubs.delete(item.id);
          this.patchUpload(item.id, { status: 'done', percent: 100 });
          this.processing = false;
          // Show the freshly uploaded file straight away.
          this.loadDir(this.currentPath());
          this.processQueue();
        },
      });
    this.uploadSubs.set(item.id, sub);
  }

  /** Re-queue a failed upload. */
  retryUpload(item: UploadItem): void {
    if (item.status !== 'failed') return;
    this.patchUpload(item.id, { status: 'queued', percent: 0, error: undefined });
    this.processQueue();
  }

  /**
   * Cancel a queued or in-flight upload. Unsubscribing tears down the cold
   * upload observable, which aborts the in-flight chunk request; the row is
   * removed and the queue advances.
   */
  cancelUpload(item: UploadItem): void {
    const wasUploading = item.status === 'uploading';
    const sub = this.uploadSubs.get(item.id);
    if (sub) {
      sub.unsubscribe();
      this.uploadSubs.delete(item.id);
    }
    this.uploads.update(list => list.filter(u => u.id !== item.id));
    if (wasUploading) {
      this.processing = false;
      this.processQueue();
    }
  }

  /** Remove a finished (done/failed) row from the panel. */
  dismissUpload(item: UploadItem): void {
    this.uploads.update(list => list.filter(u => u.id !== item.id));
  }

  hasFinishedUploads(): boolean {
    return this.uploads().some(u => u.status === 'done' || u.status === 'failed');
  }

  /** Clear all finished rows, leaving queued/in-flight ones. */
  clearFinishedUploads(): void {
    this.uploads.update(list => list.filter(u => u.status === 'queued' || u.status === 'uploading'));
  }

  uploadIcon(status: UploadStatus): string {
    switch (status) {
      case 'done': return 'check-circle';
      case 'failed': return 'warning';
      case 'uploading': return 'arrow-up';
      default: return 'timer';
    }
  }

  createFolder(): void {
    if (!this.newFolderName.trim()) return;
    const path = this.join(this.currentPath(), this.newFolderName.trim());
    this.filesApi.createDir(this.activeSpaceId(), path).subscribe({
      next: () => {
        this.newFolderName = '';
        this.showNewFolder.set(false);
        this.loadDir(this.currentPath());
        this.loadTreeRoot();
      },
      error: () => this.toast.error(this.transloco.translate('files.error.createFolderFailed')),
    });
  }

  startRename(entry: FileEntry): void {
    this.renamingEntry.set(entry.name);
    this.renameValue = entry.name;
  }

  confirmRename(entry: FileEntry): void {
    const from = this.join(this.currentPath(), entry.name);
    const parentDir = this.currentPath();
    const to = this.join(parentDir, this.renameValue.trim());
    this.filesApi.moveFile(this.activeSpaceId(), from, to).subscribe({
      next: () => {
        this.renamingEntry.set('');
        this.loadDir(this.currentPath());
      },
      error: () => this.toast.error(this.transloco.translate('files.error.renameFailed')),
    });
  }

  async deleteEntry(entry: FileEntry): Promise<void> {
    const ok = await this.confirmDialog.confirm({
      title: this.transloco.translate('files.confirm.deleteFileTitle'),
      message: this.transloco.translate('files.confirm.deleteFile', { name: entry.name }),
      confirmLabel: this.transloco.translate('common.delete'),
      danger: true,
    });
    if (!ok) return;
    const path = this.join(this.currentPath(), entry.name);
    this.filesApi.deleteFile(this.activeSpaceId(), path).subscribe({
      next: () => { this.loadDir(this.currentPath()); this.fileDeleted.emit(); },
      error: () => this.toast.error(this.transloco.translate('files.error.deleteFailed')),
    });
  }

  /** The file GET URL (no token — auth goes in the fetch header, never the URL). */
  private fileApiUrl(entry: FileEntry): string {
    return this.filesApi.getFileDownloadUrl(this.activeSpaceId(), this.join(this.currentPath(), entry.name));
  }

  /**
   * Download a file. A plain `<a href download>` can't send the auth header, and
   * the file endpoint no longer honours a `?token=` query param (#134), so fetch
   * the bytes with the token and save them via a temporary blob URL.
   */
  async downloadFile(entry: FileEntry): Promise<void> {
    const token = this.auth.token();
    try {
      const res = await fetch(this.fileApiUrl(entry), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const objUrl = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
    } catch (e) {
      this.toast.error(`${this.transloco.translate('files.downloadFailed')} ${httpErrorReason(e)}`.trim());
    }
  }

  /** Returns the space-relative path for a preview entry (used for brain metadata links). */
  previewFilePath(entry: FileEntry): string {
    return this.join(this.currentPath(), entry.name);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  private join(base: string, name: string): string {
    return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
  }

  private updateBreadcrumbs(path: string): void {
    const parts = path.split('/').filter(Boolean);
    const crumbs: BreadcrumbSegment[] = [{ label: 'root', path: '/' }];
    let accumulated = '/';
    for (const p of parts) {
      accumulated = accumulated.endsWith('/') ? `${accumulated}${p}` : `${accumulated}/${p}`;
      crumbs.push({ label: p, path: accumulated });
    }
    this.breadcrumbs.set(crumbs);
  }

  // ── Tree sidebar ─────────────────────────────────────────────────────────

  toggleSidebar(): void {
    const open = !this.sidebarOpen();
    this.sidebarOpen.set(open);
    localStorage.setItem('ythril.sidebar', open ? 'open' : 'closed');
    if (open && this.treeRoot().length === 0) this.loadTreeRoot();
  }

  private loadTreeRoot(): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    this.filesApi.listFiles(spaceId, '/').subscribe({
      next: ({ entries }) => {
        this.treeRoot.set(
          entries
            .filter(e => e.isDirectory)
            .map(e => ({ name: e.name, path: this.join('/', e.name), expanded: false, loading: false, children: null })),
        );
      },
      error: () => {},
    });
  }

  onTreeClick(node: TreeNode): void {
    this.navigate(node.path);
    if (!node.expanded) {
      this.expandTreeNode(node);
    } else {
      node.expanded = false;
      this.treeRoot.set([...this.treeRoot()]);
    }
  }

  private expandTreeNode(node: TreeNode): void {
    if (node.children !== null) {
      node.expanded = true;
      this.treeRoot.set([...this.treeRoot()]);
      return;
    }
    node.loading = true;
    this.treeRoot.set([...this.treeRoot()]);
    this.filesApi.listFiles(this.activeSpaceId(), node.path).subscribe({
      next: ({ entries }) => {
        node.children = entries
          .filter(e => e.isDirectory)
          .map(e => ({ name: e.name, path: this.join(node.path, e.name), expanded: false, loading: false, children: null }));
        node.loading = false;
        node.expanded = true;
        this.treeRoot.set([...this.treeRoot()]);
      },
      error: () => {
        node.loading = false;
        this.treeRoot.set([...this.treeRoot()]);
      },
    });
  }

  // ── Preview ──────────────────────────────────────────────────────────────

  openPreview(entry: FileEntry): void {
    const kind = previewKind(entry.name);
    this.previewFile.set(entry);
    this.previewKind.set(kind);
    this.previewHtml.set('');
    this.previewError.set(null);
    this.revokePreviewUrl();
    this.previewMediaUrl.set('');
    this.previewSafeUrl.set('');

    // Every preview fetch must carry the auth header — the file endpoint requires it,
    // and a browser-native <img src>/<iframe src> can't send one (that regressed image
    // and PDF previews when the ?token= fallback was scoped to SSE-only, #134). So we
    // fetch with the token and hand the view a same-origin blob: object URL instead.
    const url = this.fileApiUrl(entry);
    const token = this.auth.token();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    if (kind === 'text') {
      this.previewLoading.set(true);
      fetch(url, { headers })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
        .then(text => {
          const ext = extOf(entry.name);
          const lang = EXT_LANG[ext] ?? 'plaintext';
          this.previewHtml.set(hljs.highlight(text, { language: lang }).value);
          this.previewLoading.set(false);
        })
        .catch((e) => { this.previewError.set(httpErrorReason(e)); this.previewLoading.set(false); });
    } else if (kind === 'image' || kind === 'pdf') {
      this.previewLoading.set(true);
      fetch(url, { headers })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
        .then(blob => {
          const objUrl = URL.createObjectURL(blob);
          this._previewObjectUrl = objUrl;
          if (kind === 'image') this.previewMediaUrl.set(objUrl);
          else this.previewSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objUrl));
          this.previewLoading.set(false);
        })
        .catch((e) => { this.previewError.set(httpErrorReason(e)); this.previewLoading.set(false); });
    }

    document.addEventListener('keydown', this._keyHandler);
    setTimeout(() => this.previewOverlayRef()?.nativeElement?.focus());
  }

  /** Revoke the current preview blob URL (if any) to avoid leaking object URLs. */
  private revokePreviewUrl(): void {
    if (this._previewObjectUrl) {
      URL.revokeObjectURL(this._previewObjectUrl);
      this._previewObjectUrl = null;
    }
  }

  closePreview(): void {
    this.previewFile.set(null);
    this.revokePreviewUrl();
    document.removeEventListener('keydown', this._keyHandler);
  }

  onPreviewKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.closePreview();
      return;
    }
    const files = this.entries().filter(f => f.isFile);
    const current = this.previewFile();
    if (!current || files.length === 0) return;

    const idx = files.findIndex(f => f.name === current.name);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = files[(idx + 1) % files.length];
      this.openPreview(next);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = files[(idx - 1 + files.length) % files.length];
      this.openPreview(prev);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this._keyHandler);
    this.revokePreviewUrl();
    // Abort any in-flight/queued uploads so their requests don't outlive the view.
    for (const sub of this.uploadSubs.values()) sub.unsubscribe();
    this.uploadSubs.clear();
  }
}
