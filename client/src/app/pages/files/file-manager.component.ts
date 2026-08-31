import { ChangeDetectionStrategy, Component, inject, signal, computed, effect, untracked, OnInit, OnDestroy, HostListener, ElementRef, viewChild, Input, Output, EventEmitter } from '@angular/core';
import { SortableHeaderComponent } from '../brain/sortable-header.component';
import { FilePreviewComponent, type FilePreview, type PreviewKind, type XlsxPreview } from './file-preview.component';
import { UploadQueueComponent, type UploadItem, type UploadStatus } from './upload-queue.component';
import { formatSize } from './file-format';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { Space, FileEntry, FileMeta, FileExtract, UploadProgress } from '../../core/api.types';
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
import { StepProgressBarComponent } from '../../shared/step-progress-bar.component';
import { MarkdownRenderService } from '../../shared/markdown-render.service';
// The docked detail pane reuses the Brain's file-metadata edit fields. These are dumb, shared
// ref-field widgets; they resolve chip labels via EntityRefPicker, which the Brain provides — so the
// "File meta" edit mode is available only when embedded in the Brain (embeddedSpaceId set).
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntityRefFieldComponent } from '../brain/entity-ref-field.component';
import { MemoryRefFieldComponent } from '../brain/memory-ref-field.component';
import { ChronoRefFieldComponent } from '../brain/chrono-ref-field.component';
import { EntityRefPicker } from '../brain/entity-ref-picker.service';
import { BrainStore } from '../brain/brain-store.service';
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
import { HscrollTopDirective } from '../../shared/hscroll-top.directive';
import { ModalDirective } from '../../shared/modal.directive';
import { TimestampComponent } from '../../shared/timestamp.component';

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


/** A parsed spreadsheet preview: the first sheet as a capped grid, with a note when truncated. */
const XLSX_MAX_ROWS = 200;
const XLSX_MAX_COLS = 40;



const TEXT_EXTS = new Set([
  '.txt', '.json', '.yaml', '.yml', '.ts', '.js', '.py', '.sh',
  '.csv', '.xml', '.html', '.css', '.log', '.env', '.toml',
]);
// Markdown renders formatted (via marked) rather than as highlighted source.
const MARKDOWN_EXTS = new Set(['.md', '.markdown']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']);
const PDF_EXTS = new Set(['.pdf']);
// exceljs reads the OOXML formats (.xlsx/.xlsm), not the legacy binary .xls — don't promise what won't parse.
const XLSX_EXTS = new Set(['.xlsx', '.xlsm']);

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
  if (MARKDOWN_EXTS.has(ext)) return 'markdown';
  if (TEXT_EXTS.has(ext)) return 'text';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (PDF_EXTS.has(ext)) return 'pdf';
  if (XLSX_EXTS.has(ext)) return 'xlsx';
  return 'unknown';
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

/** Coerce an exceljs cell value (string | number | Date | formula | richText | hyperlink | error) to display text. */
function xlsxCellText(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toLocaleDateString();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o['richText'])) return (o['richText'] as Array<{ text?: string }>).map(t => t.text ?? '').join('');
    if ('result' in o) return o['result'] == null ? '' : String(o['result']);   // formula → computed result
    if ('text' in o) return String(o['text']);                                   // hyperlink label
    if ('error' in o) return String(o['error']);
    return '';
  }
  return String(v);
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
  imports: [CommonModule, FormsModule, PhIconComponent, TranslocoPipe, ErrorStateComponent, TagInputComponent, EntityRefFieldComponent, MemoryRefFieldComponent, ChronoRefFieldComponent, SortableHeaderComponent, StepProgressBarComponent, HscrollTopDirective, ModalDirective, TimestampComponent, FilePreviewComponent, UploadQueueComponent],
  styles: [`
    /* A background refresh, as a 2px indeterminate hairline above the table. Deliberately NOT a spinner and
       deliberately not an overlay: the whole point is that nothing on screen moves or disappears while a poll
       is in flight. It reserves its own 2px so the table does not shift when it appears.
       NO BACKTICKS anywhere in this block — it is one template string. */
    .fm-refreshing {
      height: 2px;
      margin-bottom: 6px;
      border-radius: 2px;
      overflow: hidden;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
    }
    .fm-refreshing::after {
      content: '';
      display: block;
      width: 34%;
      height: 100%;
      border-radius: 2px;
      background: var(--accent);
      animation: fm-slide 1.1s ease-in-out infinite;
    }
    @keyframes fm-slide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }
    /* Honesty when a poll fails: the rows stay, but they are no longer claimed to be current. */
    .fm-stale {
      font-size: 12px;
      color: var(--warning, var(--text-muted));
      margin-bottom: 6px;
    }
    @media (prefers-reduced-motion: reduce) {
      .fm-refreshing::after { animation: none; width: 100%; opacity: .5; }
    }

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

    /* Merged metadata columns: embedding-status pill + tag chips (joined from the file's FileMeta). */
    .emb-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 500;
      padding: 1px 8px; border-radius: 20px; white-space: nowrap; border: 1px solid transparent; }
    .emb-pill .emb-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
    .emb-complete { color: var(--success); background: color-mix(in srgb, var(--success) 14%, transparent); border-color: color-mix(in srgb, var(--success) 30%, transparent); }
    .emb-complete .emb-dot { background: var(--success); }
    .emb-pending, .emb-processing { color: var(--info); background: color-mix(in srgb, var(--info) 14%, transparent); border-color: color-mix(in srgb, var(--info) 30%, transparent); }
    .emb-pending .emb-dot, .emb-processing .emb-dot { background: var(--info); }
    .emb-partial { color: var(--warning); background: color-mix(in srgb, var(--warning) 15%, transparent); border-color: color-mix(in srgb, var(--warning) 32%, transparent); }
    .emb-partial .emb-dot { background: var(--warning); }
    .emb-failed { color: var(--error); background: color-mix(in srgb, var(--error) 14%, transparent); border-color: color-mix(in srgb, var(--error) 30%, transparent); }
    .emb-failed .emb-dot { background: var(--error); }
    .emb-skipped, .emb-disabled { color: var(--text-muted); background: var(--bg-elevated); border-color: var(--border); }
    .emb-skipped .emb-dot, .emb-disabled .emb-dot { background: var(--text-muted); }
    .tag-list { display: inline-flex; gap: 4px; flex-wrap: wrap; }
    .tag-chip { font-size: 10.5px; padding: 1px 7px; border-radius: 20px; background: var(--bg-elevated);
      border: 1px solid var(--border); color: var(--text-secondary); white-space: nowrap; }

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
    .rename-form { display: flex; gap: 6px; align-items: center; }

    .space-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    /* ── Docked detail pane (preview + description ⇄ file meta) ─── */
    /* A third in-flow column of .fm-layout; the list (.fm-main) reflows to full width when it's absent. */
    .fm-detail {
      width: min(480px, 42vw);
      flex-shrink: 0;
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: calc(100vh - 180px);
    }
    .detail-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .detail-header .file-title { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* Segmented [Preview & description | File meta] toggle */
    .seg-toggle { display: inline-flex; flex: 1; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .seg-toggle button {
      flex: 1; background: none; border: none; padding: 5px 10px; cursor: pointer;
      font-size: 0.82em; color: var(--text-muted); white-space: nowrap;
    }
    .seg-toggle button.active { background: var(--bg-muted); color: var(--text); font-weight: 600; }
    .seg-toggle button:not(.active):hover { background: var(--bg-hover); }
    .detail-body { flex: 1; overflow: auto; padding: 14px; }
    /* Description shown beneath the preview */
    .detail-desc { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
    .detail-desc h4 { margin: 0 0 6px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
    .detail-desc p { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
    /* Provenance sits inside the heading, quieter than it: it qualifies the description rather than
       announcing itself. Lower-case against the upper-case heading so it reads as an aside. */
    .detail-desc .desc-src { margin-left: 8px; padding: 1px 6px; border: 1px solid var(--border); border-radius: 10px;
      font-size: 0.92em; text-transform: none; letter-spacing: 0; color: var(--text-muted); cursor: help; }
    /* Extract face. A diagnostic, so it is dense and legible rather than pretty: the chunk bodies are the
       thing being read, and everything else is a label on them. */
    .detail-extract section { margin-bottom: 18px; }
    .detail-extract h4 { margin: 0 0 8px; font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-muted); }
    .detail-extract .muted { color: var(--text-muted); font-size: 0.9em; }
    .chunk { border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; background: var(--bg-primary); }
    .chunk-head { display: flex; gap: 8px; align-items: baseline; margin-bottom: 5px; font-size: 0.82em; }
    .chunk-ix { font-family: var(--font-mono, monospace); color: var(--text-muted); flex: none; }
    /* Provenance can be a long heading; it truncates rather than pushing the row. */
    .chunk-prov { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chunk-warn { color: var(--warning); flex: none; }
    /* pre-wrap, because a chunk's own line breaks are part of what retrieval sees. */
    .chunk-body { margin: 0; white-space: pre-wrap; word-break: break-word; line-height: 1.45; font-size: 0.92em; }
    .xtr-image { border-top: 1px solid var(--border); padding: 8px 0; }
    .xtr-image p { margin: 4px 0 0; line-height: 1.45; font-size: 0.92em; }
    .xtr-path { font-family: var(--font-mono, monospace); font-size: 0.82em; color: var(--text-muted); word-break: break-all; }
    .xtr-md { margin: 6px 0 0; padding: 10px; border: 1px solid var(--border); border-radius: 8px;
      background: var(--bg-primary); max-height: 40vh; overflow: auto; white-space: pre-wrap;
      word-break: break-word; font-size: 0.85em; line-height: 1.45; }
    .detail-extract .desc-src { margin-left: 6px; padding: 1px 6px; border: 1px solid var(--border);
      border-radius: 10px; font-size: 0.86em; color: var(--text-muted); cursor: help; }
    .detail-meta-form .field { margin-bottom: 12px; }
    .detail-meta-form label { display: block; margin-bottom: 4px; font-size: 0.8em; color: var(--text-muted); }
    .detail-meta-form textarea { width: 100%; resize: vertical; }
    .detail-meta-actions { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
    /* Full-screen toggle floats at the top-right of the preview body. */
    .preview-body { position: relative; }
    .preview-fs-btn { position: absolute; top: 4px; right: 4px; z-index: 1; opacity: 0.75; }
    .preview-fs-btn:hover { opacity: 1; }
    /* Formatted markdown */
    .mermaid-diagram { display: flex; justify-content: center; margin: 0.8em 0; }
    .mermaid-diagram svg { max-width: 100%; height: auto; }
    /* Full-screen preview overlay */
    .preview-fs-overlay {
      position: fixed; inset: 0; z-index: 1200;
      background: var(--bg-surface); display: flex; flex-direction: column;
    }
    .preview-fs-bar {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
    }
    .preview-fs-bar .file-title { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview-fs-body { flex: 1; overflow: auto; padding: 20px; max-width: 1100px; width: 100%; margin: 0 auto; }
    .preview-body {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }

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
    } @else if (spacesError() !== null) {
      <!-- Reachable only when this component is routed standalone, which it currently is not: the sole call
           site passes embeddedSpaceId, so ngOnInit returns before loadSpaces(). Kept correct rather than
           deleted because the standalone /files route existed until recently and the branch is five lines;
           without it a failed space list renders an empty selector and NO body, which reads as a broken
           page rather than a failed request. -->
      <app-error-state [message]="'files.loadSpacesError' | transloco" [reason]="spacesError() ?? ''" (retry)="retrySpaces()" />
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
          <app-upload-queue
            [uploads]="uploads()"
            [hasFinished]="hasFinishedUploads()"
            (retry)="retryUpload($event)"
            (cancel)="cancelUpload($event)"
            (dismiss)="dismissUpload($event)"
            (clearFinished)="clearFinishedUploads()" />
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
          <!-- A background refresh is a HAIRLINE, not an unmount. The table below stays exactly where it is and
               its rows update in place, so the per-row progress bars advance instead of the screen blinking. -->
          @if (refreshing()) { <div class="fm-refreshing" role="status" [attr.aria-label]="'files.refreshing' | transloco"></div> }
          @if (refreshFailed()) {
            <div class="fm-stale">{{ 'files.refreshFailed' | transloco }}</div>
          }
          <div class="table-wrapper" hscrollTop>
            <table>
              <thead>
                <tr>
                  <th style="width:24px"></th>
                  <th app-sort-th field="name" label="files.table.name" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th app-sort-th field="status" label="files.table.status" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th>{{ 'files.table.tags' | transloco }}</th>
                  <th app-sort-th field="size" label="files.table.size" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th app-sort-th field="modified" label="files.table.modified" [activeField]="sortField()" [dir]="sortDir()" (sort)="setSort($event)"></th>
                  <th>{{ 'files.table.actions' | transloco }}</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of sortedEntries(); track entry.name) {
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
                    <td>
                      @if (entry.isFile && entry.progress) {
                        <!-- In flight AND the worker has reported a stage: show WHICH stage of this
                             file's own route is running, rather than a generic "embedding" + spinner
                             that looks identical whether the job is working or wedged. Falls back to
                             the pill below the moment the job finishes or before it reports. -->
                        <app-step-progress-bar
                          [progress]="entry.progress"
                          [progressAt]="entry.progressAt" />
                      } @else if (entry.isFile && entry.embeddingStatus) {
                        <span class="emb-pill" [class]="'emb-' + entry.embeddingStatus">
                          <span class="emb-dot"></span>{{ 'files.embStatus.' + entry.embeddingStatus | transloco }}
                        </span>
                      }
                    </td>
                    <td>
                      @if (entry.tags?.length) {
                        <span class="tag-list">@for (t of entry.tags; track t) { <span class="tag-chip">{{ t }}</span> }</span>
                      }
                    </td>
                    <td style="color:var(--text-muted)">
                      {{ formatSize(entry.size) }}
                    </td>
                    <td><app-timestamp [value]="entry.modified"/></td>
                    <td style="display:flex; gap:6px; align-items:center;">
                      @if (entry.isFile) {
                        <button
                          type="button"
                          class="btn-ghost btn btn-sm"
                          (click)="downloadFile(entry)"
                          [attr.aria-label]="'files.downloadAriaLabel' | transloco"
                        ><ph-icon name="download-simple" [size]="16"/></button>
                      }
                      @if (canRequeue(entry)) {
                        <!-- Re-embedding was reachable only from the detail pane, so fixing a file whose
                             embedding failed meant OPENING it first — and the row already tells you it
                             failed. The action belongs where the diagnosis is. Hidden while a job is
                             pending or processing: the server refuses that with a 409, and an action that
                             exists only to be refused is worse than one that is absent. -->
                        <button
                          type="button"
                          class="btn-ghost btn btn-sm"
                          [disabled]="requeueingPath() === relPath(entry)"
                          (click)="requeueEmbedding(entry)"
                          [attr.title]="'brain.fileMeta.retryEmbedding' | transloco"
                          [attr.aria-label]="'files.reembedAriaLabel' | transloco"
                        ><ph-icon name="arrows-clockwise" [size]="16"/></button>
                      }
                      <!-- Rename is a pencil, not the word: it sat as the one text button among icons, so it
                           set the width of the actions column on every row and pushed delete off the edge on
                           a narrow window. Same label, on hover and for assistive tech. -->
                      <button class="btn-ghost btn btn-sm" (click)="startRename(entry)"
                        [attr.title]="'files.rename' | transloco"
                        [attr.aria-label]="'files.renameEntryAriaLabel' | transloco"
                      ><ph-icon name="pencil-simple" [size]="16"/></button>
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

          <!-- Docked detail pane: preview + description ⇄ file-meta record (the merged File Meta view).
               The list runs full width until a file is opened; opening one adds this column. -->
          @if (previewFile(); as pf) {
            <div class="fm-detail" tabindex="0" #detailPane>
              <div class="detail-header">
                @if (embeddedSpaceId) {
                  <div class="seg-toggle" role="tablist" [attr.aria-label]="'files.detail.tabsAriaLabel' | transloco">
                    <button type="button" role="tab" [class.active]="detailMode() === 'preview'" [attr.aria-selected]="detailMode() === 'preview'" (click)="detailMode.set('preview')">{{ 'files.detail.previewTab' | transloco }}</button>
                    <button type="button" role="tab" [class.active]="detailMode() === 'meta'" [attr.aria-selected]="detailMode() === 'meta'" (click)="showMetaMode()">{{ 'files.detail.metaTab' | transloco }}</button>
                    <!-- Extract: what retrieval actually sees. Only for files that HAVE been through the
                         pipeline — offering it on a file with no chunks and no conversion would be a tab
                         that always says "nothing here". -->
                    @if (hasExtract()) {
                      <button type="button" role="tab" [class.active]="detailMode() === 'extract'" [attr.aria-selected]="detailMode() === 'extract'" (click)="showExtractMode()">{{ 'files.detail.extractTab' | transloco }}</button>
                    }
                  </div>
                } @else {
                  <span class="file-title" [title]="pf.name">{{ pf.name }}</span>
                }
                <button class="icon-btn" (click)="closePreview()" [attr.aria-label]="'files.closePreviewAriaLabel' | transloco"><ph-icon name="x" [size]="16"/></button>
              </div>

              <div class="detail-body">
                @if (detailMode() === 'preview' || !embeddedSpaceId) {
                  <div class="preview-body">
                    <!-- Full-screen toggle: shown once there's rendered content (not while loading / on error). -->
                    @if (!previewLoading() && previewError() === null && previewKind() !== 'unknown') {
                      <button class="btn-ghost btn btn-sm preview-fs-btn" type="button" (click)="previewFullscreen.set(true)" [attr.title]="'files.preview.fullscreen' | transloco" [attr.aria-label]="'files.preview.fullscreen' | transloco"><ph-icon name="corners-out" [size]="16"/></button>
                    }
                    <app-file-preview [preview]="previewModel()" />
                  </div>
                  @if (selectedMeta()?.description) {
                    <div class="detail-desc">
                      <h4>
                        {{ 'files.detail.description' | transloco }}
                        <!-- Whose words these are. The release note said "generated" while the value was
                             the head of the document's own text, and nothing on screen could tell them
                             apart; a description a person typed carries no badge at all. -->
                        @if (selectedMeta()!.descriptionSource; as src) {
                          <span class="desc-src" [attr.title]="'files.detail.descriptionSource.' + src + 'Hint' | transloco">{{ 'files.detail.descriptionSource.' + src | transloco }}</span>
                        }
                      </h4>
                      <p>{{ selectedMeta()!.description }}</p>
                    </div>
                  }
                } @else if (detailMode() === 'extract') {
                  <!-- Extract: what retrieval actually sees.
                       The _converted/ and _extracted/ folders are hidden from browsing, which is right and
                       which removed the only way to answer "what did the pipeline get out of this file?" —
                       the first question when a document answers queries badly. Hidden from browsing, not
                       from inspection. Nothing here is new data; these are records conversion already wrote. -->
                  <div class="detail-extract">
                    @if (extractLoading()) {
                      <div class="muted">{{ 'files.extract.loading' | transloco }}</div>
                    } @else if (extractError()) {
                      <app-error-state [message]="'files.extract.error' | transloco" [reason]="extractError() ?? ''" (retry)="loadExtract(pf)" />
                    } @else if (extract(); as x) {
                      @if (x.conversionError) {
                        <div class="alert alert-error" role="alert">{{ x.conversionError }}</div>
                      }

                      <!-- Chunks first, deliberately: they ARE what retrieval matches on. The converted
                           Markdown is the input to chunking, and the images are a side product. -->
                      <section>
                        <h4>{{ 'files.extract.chunks' | transloco: { shown: x.chunks.length, total: x.chunkTotal } }}</h4>
                        @if (x.chunks.length === 0) {
                          <p class="muted">{{ 'files.extract.noChunks' | transloco }}</p>
                        }
                        @for (c of x.chunks; track c.id) {
                          <div class="chunk">
                            <div class="chunk-head">
                              <span class="chunk-ix">#{{ c.index }}</span>
                              <!-- One provenance line, whichever kind of provenance this chunk has: a
                                   timestamp for audio, the heading it opened for a document. -->
                              @if (c.chunkOffsetMs !== null) {
                                <span class="chunk-prov">{{ msRange(c.chunkOffsetMs, c.chunkDurationMs) }}</span>
                              } @else if (c.headingText) {
                                <span class="chunk-prov">{{ c.headingText }}</span>
                              }
                              @if (c.embeddingStatus && c.embeddingStatus !== 'complete') {
                                <span class="chunk-warn">{{ c.embeddingStatus }}</span>
                              }
                            </div>
                            <p class="chunk-body">{{ c.content }}</p>
                          </div>
                        }
                        @if (x.chunkTotal > x.chunks.length + x.skip) {
                          <button class="btn btn-sm btn-secondary" type="button" (click)="moreChunks(pf)">{{ 'files.extract.more' | transloco }}</button>
                        }
                      </section>

                      @if (x.images.length > 0) {
                        <section>
                          <h4>{{ 'files.extract.images' | transloco: { count: x.images.length } }}</h4>
                          @for (img of x.images; track img.path) {
                            <div class="xtr-image">
                              <span class="xtr-path">{{ img.path }}</span>
                              @if (img.description) {
                                <p>
                                  {{ img.description }}
                                  @if (img.descriptionSource) {
                                    <span class="desc-src" [attr.title]="'files.detail.descriptionSource.' + img.descriptionSource + 'Hint' | transloco">{{ 'files.detail.descriptionSource.' + img.descriptionSource | transloco }}</span>
                                  }
                                </p>
                              } @else {
                                <p class="muted">{{ 'files.extract.noCaption' | transloco }}</p>
                              }
                            </div>
                          }
                        </section>
                      }

                      @if (x.converted; as conv) {
                        <section>
                          <h4>{{ 'files.extract.converted' | transloco }}</h4>
                          <div class="muted xtr-path">{{ conv.path }}</div>
                          @if (conv.truncated) {
                            <div class="muted">{{ 'files.extract.truncated' | transloco }}</div>
                          }
                          <pre class="xtr-md">{{ conv.markdown }}</pre>
                        </section>
                      }
                    }
                  </div>
                } @else {
                  <!-- File-meta edit form (embedded only — reuses the Brain ref-field widgets). -->
                  <form class="detail-meta-form" (ngSubmit)="saveMeta(pf)" #metaForm="ngForm">
                    <div class="field">
                      <label>{{ 'brain.fileMeta.table.description' | transloco }}</label>
                      <textarea [(ngModel)]="metaEditModel.description" name="detailDesc" rows="3"></textarea>
                    </div>
                    <div class="field">
                      <label>{{ 'brain.fileMeta.table.tags' | transloco }}</label>
                      <app-tag-input [(value)]="metaEditModel.tags" inputName="detailTags" />
                    </div>
                    <div class="field">
                      <label>{{ 'brain.fileMeta.table.entities' | transloco }}</label>
                      <app-entity-ref-field [target]="metaEditModel" [spaceId]="activeSpaceId()" />
                    </div>
                    <div class="field">
                      <label>{{ 'brain.fileMeta.table.memories' | transloco }}</label>
                      <app-memory-ref-field [target]="metaEditModel" />
                    </div>
                    <div class="field">
                      <label>{{ 'brain.fileMeta.table.chrono' | transloco }}</label>
                      <app-chrono-ref-field [target]="metaEditModel" />
                    </div>
                    @if (metaError()) { <div class="alert alert-error" role="alert">{{ metaError() }}</div> }
                    <div class="detail-meta-actions">
                      <button class="btn btn-sm btn-primary" type="submit" [disabled]="metaSaving()">{{ 'common.save' | transloco }}</button>
                      <button class="btn btn-sm btn-secondary" type="button" (click)="cancelMeta()">{{ 'common.cancel' | transloco }}</button>
                      @if (pf.embeddingStatus === 'failed' || pf.embeddingStatus === 'partial') {
                        <button class="btn btn-sm btn-ghost" type="button"
                          [disabled]="requeueingPath() === relPath(pf)"
                          (click)="requeueEmbedding(pf)">{{ 'brain.fileMeta.retryEmbedding' | transloco }}</button>
                      }
                    </div>
                  </form>
                }
              </div>
            </div>
          }
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

    <!-- Preview content, shared by the docked pane and the full-screen overlay. -->

    <!-- Full-screen preview overlay (the one intentional fixed overlay — for the full-screen button).
         NO BACKTICKS IN THIS TEMPLATE: one ends the string and the error points at @Component, never at the comment.
         appModal supplies role=dialog, aria-modal, a CDK focus trap and focus restore on close. Escape was already
         handled by this component's document keydown listener (full-screen collapses first, then the pane closes),
         but the TRAP was not: Tab walked out of a full-screen overlay into the page behind it, which is covered and
         invisible. The fsOverlay template ref that used to sit here was never referenced from TypeScript —
         evidence that focus had been thought about and never wired.
         No backdrop dismissal: this overlay IS the backdrop, and Escape or the close button already dismiss it. -->
    @if (previewFullscreen() && previewFile(); as pf) {
      <div class="preview-fs-overlay" tabindex="0" [appModal]="'files.preview.fullscreenDialog' | transloco">
        <div class="preview-fs-bar">
          <span class="file-title" [title]="pf.name">{{ pf.name }}</span>
          <button class="icon-btn" (click)="previewFullscreen.set(false)" [attr.aria-label]="'files.preview.exitFullscreen' | transloco"><ph-icon name="x" [size]="18"/></button>
        </div>
        <div class="preview-fs-body preview-body">
          <app-file-preview [preview]="previewModel()" />
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
  private markdown = inject(MarkdownRenderService);
  private confirmDialog = inject(ConfirmDialogService);
  private detailPaneRef = viewChild<ElementRef<HTMLDivElement>>('detailPane');
  // Brain-provided (only present when embedded in the Brain). Optional so the standalone /files route,
  // where the Brain injector isn't in the tree, still constructs — there the meta edit mode is hidden.
  private picker = inject(EntityRefPicker, { optional: true });
  /** Optional for the same reason as `picker`: this component also runs outside the Brain shell. */
  private store = inject(BrainStore, { optional: true });

  constructor() {
    /**
     * Live refresh while a file is processing.
     *
     * The shell already opens an SSE stream and bumps `liveRefreshTick` on a `file.*` event — that is how
     * every record tab stays current. This list never read it. The status pill and the processing stage
     * bar are both built from the DIRECTORY LISTING, so with no reload they sat at whatever they were
     * when the folder was first opened: a file could finish and still read "Embedding" until you clicked
     * away and back. Nothing errored, which is why it looked like a slow pipeline rather than a stale view.
     *
     * `untracked` around the reload so the effect depends on the tick ALONE — `loadDir` reads
     * `currentPath()`, and tracking that would reload the directory on every navigation as well.
     */
    let firstTick = true;
    effect(() => {
      this.store?.liveRefreshTick();
      if (firstTick) { firstTick = false; return; }
      untracked(() => this.reloadDir());
    });
  }

  /** When set (embedded in brain), skip space loading and use this space. */
  @Input() embeddedSpaceId = '';

  /** Fires whenever the file set in this space changes (delete or upload complete) so the host can refresh counts. */
  @Output() filesChanged = new EventEmitter<void>();

  spaces = signal<Space[]>([]);
  activeSpaceId = signal('');
  currentPath = signal('/');
  entries = signal<FileEntry[]>([]);

  // ── Column sort (restores what #421 dropped) ───────────────────────────────
  // Sorted CLIENT-side, which is honest here and only here: `listFiles` returns a whole directory in one
  // response (no limit/skip), so this reorders the complete set. The paginated record tabs must sort
  // server-side for exactly the opposite reason — there, a client sort would reorder one page and lie
  // about the rest.
  sortField = signal<'' | 'name' | 'status' | 'size' | 'modified'>('');
  sortDir = signal<'asc' | 'desc'>('asc');

  /** desc -> asc -> unsorted, matching the record tabs' shared header primitive. */
  setSort(field: string): void {
    const f = field as '' | 'name' | 'status' | 'size' | 'modified';
    if (this.sortField() !== f) { this.sortField.set(f); this.sortDir.set('asc'); return; }
    if (this.sortDir() === 'asc') { this.sortDir.set('desc'); return; }
    this.sortField.set('');            // third click clears back to the server's own order
    this.sortDir.set('asc');
  }

  /**
   * Folders always come first — this is a file explorer, and interleaving directories with files by size
   * or date makes the tree unnavigable. The chosen column orders WITHIN each group.
   */
  sortedEntries = computed<FileEntry[]>(() => {
    const list = this.entries();
    const field = this.sortField();
    if (!field) return list;
    const sign = this.sortDir() === 'asc' ? 1 : -1;
    const key = (e: FileEntry): string | number => {
      switch (field) {
        case 'size': return e.size ?? 0;
        case 'modified': return e.modified ?? '';
        case 'status': return e.embeddingStatus ?? '';
        default: return e.name.toLowerCase();
      }
    };
    return [...list].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      const ka = key(a), kb = key(b);
      if (ka === kb) return a.name.localeCompare(b.name);   // stable, human tiebreak
      return (typeof ka === 'number' && typeof kb === 'number')
        ? (ka - kb) * sign
        : String(ka).localeCompare(String(kb)) * sign;
    });
  });
  /**
   * True only while a load that has **nothing to show** is in flight — the state that replaces the view.
   *
   * A REFRESH must never enter it. It used to: `loadDir` set this on every call, including the 4-second progress
   * poll, so watching an ingest meant the whole file table was unmounted and replaced by a spinner every four
   * seconds. A reporting operator, verbatim: *"i only want to see progress bars move while waiting and not a
   * screenflickering."* They were right about the mechanism too — the view treated "a refetch is in flight" as
   * "we have no data yet".
   *
   * The rule, worth stating as a rule: **a refresh must never re-enter the empty state a first load uses.**
   */
  loading = signal(false);
  /** True while a reload of the SAME directory is in flight over rows already on screen. Never unmounts them. */
  refreshing = signal(false);
  /** Set when a background refresh failed, so stale rows are not passed off as current. Cleared on success. */
  refreshFailed = signal(false);
  /** Failure reason for the directory listing; null when it loaded (U3). */
  loadError = signal<string | null>(null);
  loadingSpaces = signal(true);
  /** Null until the space list failed to load — else the page renders with no selector and no body. */
  spacesError = signal<string | null>(null);

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
  // A string for highlighted source (Angular sanitizes on bind); a trusted SafeHtml for rendered markdown
  // (we sanitize with DOMPurify first, because it may contain inlined mermaid SVG that Angular would strip).
  previewHtml = signal<string | SafeHtml>('');
  previewLoading = signal(false);
  previewMediaUrl = signal('');
  previewSafeUrl = signal<SafeResourceUrl>('');
  /** Set when preview fetch fails (e.g. auth/404) so we show a reason, not a blank pane. */
  previewError = signal<string | null>(null);
  /** Parsed spreadsheet preview (first sheet, capped) when previewKind is 'xlsx'. */
  previewTable = signal<XlsxPreview | null>(null);

  /**
   * The eight preview signals as the one object the renderer takes.
   *
   * Computed here rather than passed as eight inputs: the states are mutually exclusive and saying so once, in
   * a place that can see all of them, is what stops the child re-deriving "am I loading or erroring" from
   * flags it receives separately. Null when nothing is open, which is the child's own empty case.
   */
  previewModel = computed<FilePreview | null>(() => {
    const file = this.previewFile();
    if (!file) return null;
    return {
      file,
      loading: this.previewLoading(),
      error: this.previewError(),
      kind: this.previewKind(),
      html: this.previewHtml(),
      mediaUrl: this.previewMediaUrl(),
      safeUrl: this.previewSafeUrl(),
      table: this.previewTable(),
    };
  });
  /** Blob object URL backing the current image/PDF preview; revoked on close/next. */
  private _previewObjectUrl: string | null = null;
  /** True while the preview is expanded to a full-screen overlay (Escape collapses it first). */
  previewFullscreen = signal(false);

  // ── Docked detail-pane state (preview+description ⇄ file-meta record) ──────
  /** Which face of the detail pane is showing. Meta editing is only reachable when embedded. */
  detailMode = signal<'preview' | 'meta' | 'extract'>('preview');
  /** The FileMeta record for the open file (its description + links); null until the fetch lands. */
  selectedMeta = signal<FileMeta | null>(null);

  // ── Extract face: what retrieval actually sees ─────────────────────────────
  extract = signal<FileExtract | null>(null);
  extractLoading = signal(false);
  extractError = signal<string | null>(null);

  /**
   * Whether this file HAS an extract to show.
   *
   * Offered only for a file that went through the pipeline: chunks, a converted sidecar, or a media type
   * that produces either. A tab that is always present and always says "nothing here" teaches people to
   * ignore it, which is the same lesson as a health dot that is always red.
   */
  hasExtract(): boolean {
    const m = this.selectedMeta();
    if (!m) return false;
    return (m.chunkCount ?? 0) > 0 || !!m.convertedFileId || !!m.mediaType;
  }

  /** Switch to the Extract face, fetching the first time it is opened rather than on every file open. */
  showExtractMode(): void {
    this.detailMode.set('extract');
    const pf = this.previewFile();
    if (pf && !this.extract() && !this.extractLoading()) this.loadExtract(pf);
  }

  loadExtract(entry: FileEntry, skip = 0): void {
    this.extractLoading.set(true);
    this.extractError.set(null);
    this.filesApi.getFileExtract(this.activeSpaceId(), this.relPath(entry), 100, skip).subscribe({
      next: (x) => {
        // Appended, not replaced, when paging: "show more" on a diagnostic must not throw away what the
        // reader has already scrolled through.
        const prev = skip > 0 ? this.extract() : null;
        this.extract.set(prev ? { ...x, chunks: [...prev.chunks, ...x.chunks], skip: prev.skip } : x);
        this.extractLoading.set(false);
      },
      error: (e) => { this.extractError.set(httpErrorReason(e)); this.extractLoading.set(false); },
    });
  }

  /** Next page of chunks. `skip` counts what is already on screen, not the last response's own skip. */
  moreChunks(entry: FileEntry): void {
    const shown = this.extract()?.chunks.length ?? 0;
    this.loadExtract(entry, shown);
  }

  /**
   * A chunk's position in a recording, as mm:ss or mm:ss-mm:ss.
   *
   * Audio and video chunks carry `chunkOffsetMs`; documents do not, and get their heading instead. Rendered
   * here rather than server-side because it is a display choice, and the raw milliseconds are what an API
   * consumer wants.
   */
  msRange(offsetMs: number | null, durationMs: number | null): string {
    if (offsetMs === null) return '';
    const clock = (ms: number) => {
      const total = Math.max(0, Math.round(ms / 1000));
      return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    };
    return durationMs ? `${clock(offsetMs)}-${clock(offsetMs + durationMs)}` : clock(offsetMs);
  }

  /** Edit model for the meta form — same shape the Brain File Meta tab uses (entityIds is comma-joined
   *  for app-entity-ref-field; memory/chrono are id arrays). Mutated in place by the ref-field widgets. */
  metaEditModel = { description: '', tags: [] as string[], entityIds: '', memoryIds: [] as string[], chronoIds: [] as string[] };
  metaSaving = signal(false);
  metaError = signal<string | null>(null);
  /**
   * The path whose re-embed request is in flight, or '' when none is.
   *
   * A path rather than a boolean because the action is now on every row as well as in the detail pane: one
   * shared boolean would grey out every row's button while a single file was being re-queued, which reads as
   * "the whole list is busy".
   */
  requeueingPath = signal('');

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
    this.loadSpaces();
  }

  /** Public so the error state's Retry re-runs the space list without a page reload. */
  retrySpaces(): void {
    this.loadSpaces();
  }

  private loadSpaces(): void {
    const requestedSpace = this.route.snapshot.queryParamMap.get('space') ?? '';
    this.loadingSpaces.set(true);
    this.spacesError.set(null);
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
      error: (err) => { this.spacesError.set(httpErrorReason(err)); this.loadingSpaces.set(false); },
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

  /**
   * The path `entries()` currently describes, or null before the first successful listing.
   *
   * This is what decides load-vs-refresh, rather than a flag at each call site. `loadDir` has six callers (the
   * navigation effect, the poll, the retry button, and three post-mutation reloads) and asking each to classify
   * itself is how five get it right and one does not — the exact shape of the retention bug fixed in #632.
   *
   * Comparing the PATH is also the only correct rule: rows from the directory you are leaving must not be shown
   * under the name of the one you are entering, so a navigation is always a foreground load.
   */
  private loadedPath: string | null = null;

  private loadDir(path: string): void {
    // A refresh only when there is something on screen that this listing will replace in place.
    const isRefresh = this.loadedPath === path && this.entries().length > 0 && this.loadError() === null;
    if (isRefresh) this.refreshing.set(true);
    else { this.loading.set(true); this.loadError.set(null); }
    this.filesApi.listFiles(this.activeSpaceId(), path).subscribe({
      next: ({ entries }) => {
        this.entries.set(entries);
        this.loadedPath = path;
        this.loadError.set(null);
        this.refreshFailed.set(false);
        this.loading.set(false);
        this.refreshing.set(false);
        this.syncProgressPolling();
      },
      error: (e) => {
        if (isRefresh) {
          // A failed POLL must not throw away good rows either — that is the same defect in another dress, and
          // a transient failure during an ingest is exactly when it would happen. Keep the rows, mark them as
          // not-current, and let the next tick clear it.
          this.refreshFailed.set(true);
          this.refreshing.set(false);
          return;
        }
        // A failed first listing must not fall through to the "empty folder" state (U3).
        this.loadError.set(httpErrorReason(e));
        this.loading.set(false);
      },
    });
  }

  /** Re-load the current directory — bound to the error state's Retry button. */
  reloadDir(): void { this.loadDir(this.currentPath()); }

  // ── The processing stage bar has to ADVANCE (B.5) ──────────────────────────
  //
  // The live-refresh tick above covers status CHANGES: the shell's SSE stream fires on `file.*`, which is
  // a brain write, and a file finishing is one. Per-page progress is not. `touchJobProgress` writes a
  // heartbeat on the media job record as each page lands and publishes nothing — deliberately, since
  // fanning one event per page per file out to every open tab is not a trade worth making.
  //
  // So the stage bar was drawn once, from the listing that was current when the folder was opened, and sat
  // there: "page 12 of 40" for the whole conversion. Nothing errored, which is why it read as a wedged
  // pipeline rather than a stale view — the reporter took it for the former.
  //
  // A poll is the honest mechanism for a value with no event behind it, and this one is bounded on both
  // sides: it exists only while a row on screen is actually in flight, and it skips a tick when the tab is
  // hidden. An idle folder polls nothing.

  /** 4 s: progress moves a page at a time, so faster only costs requests. `progressAt` shows staleness. */
  private static readonly PROGRESS_POLL_MS = 4_000;
  private progressPoll: ReturnType<typeof setInterval> | null = null;

  /** True while any row on screen is still being processed — the only condition that justifies polling. */
  anyInFlight(): boolean {
    return this.entries().some(e =>
      !!e.progress || e.embeddingStatus === 'pending' || e.embeddingStatus === 'processing');
  }

  /** Start or stop the poll to match what is on screen. Called after every listing load. */
  private syncProgressPolling(): void {
    if (this.anyInFlight()) {
      if (this.progressPoll !== null) return;                    // already running — never stack timers
      this.progressPoll = setInterval(() => {
        // A background tab does not need a stage bar. Skipping the tick rather than stopping the timer
        // means it resumes the moment the tab is looked at again, with no visibility listener to leak.
        if (typeof document !== 'undefined' && document.hidden) return;
        this.reloadDir();
        // The open file's own record goes stale in exactly the same way: the description a document gets
        // is written when its job finishes, so a detail pane opened during processing showed none until
        // the file was closed and reopened.
        const open = this.previewFile();
        if (open) this.loadSelectedMeta(open);
      }, FileManagerComponent.PROGRESS_POLL_MS);
    } else {
      this.stopProgressPolling();
    }
  }

  private stopProgressPolling(): void {
    if (this.progressPoll !== null) { clearInterval(this.progressPoll); this.progressPoll = null; }
  }

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
    void this.enqueueUploads(files);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    void this.enqueueUploads(files);
    input.value = '';
  }

  // ── Upload queue (U12) ──────────────────────────────────────────────────────

  /**
   * Add the picked/dropped files as queued rows and kick the processor.
   *
   * Uploading over an existing path is a REPLACE, and it takes the derived records with it: the
   * conversion chunks, the converted Markdown, the extracted images, and any description generated from
   * them are all dropped and rebuilt. That is the correct behaviour — stale chunks for a document that
   * no longer exists would be worse — but it happened silently, and a drag-and-drop onto the wrong
   * folder is an easy accident with no undo. Reported against 2.1.1.
   *
   * Asked once for the whole batch rather than once per file: a drop of twenty files where three
   * collide should be one question, not three.
   */
  private async enqueueUploads(files: FileList): Promise<void> {
    const picked = Array.from(files);
    const existing = new Set(this.entries().filter(e => e.isFile).map(e => e.name));
    const clashes = picked.filter(f => existing.has(f.name)).map(f => f.name);

    if (clashes.length > 0) {
      const ok = await this.confirmDialog.confirm({
        title: this.transloco.translate('files.confirm.overwriteTitle'),
        message: this.transloco.translate(
          clashes.length === 1 ? 'files.confirm.overwriteOne' : 'files.confirm.overwriteMany',
          { name: clashes[0], count: clashes.length, names: clashes.slice(0, 5).join(', ') },
        ),
        confirmLabel: this.transloco.translate('files.confirm.overwriteConfirm'),
        danger: true,
      });
      if (!ok) return;
    }

    const items: UploadItem[] = picked.map(file => ({
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
          // Show the freshly uploaded file straight away, and let the host refresh its record counts.
          this.loadDir(this.currentPath());
          this.filesChanged.emit();
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
      next: () => { this.loadDir(this.currentPath()); this.filesChanged.emit(); },
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

  /**
   * The shared rule, exposed for this page's template.
   *
   * A template can only call a member, so the import needs a name on the class — but it is the SAME function
   * the preview uses, not a second copy of it. Extracting the preview and leaving four lines of arithmetic
   * behind in both places is precisely the shape this codebase keeps paying for.
   */
  protected readonly formatSize = formatSize;

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
    this.previewTable.set(null);
    // Selecting a file always shows the preview face first; the meta record loads alongside so the
    // description shows here and the (embedded-only) edit form is ready when the toggle is used.
    this.detailMode.set('preview');
    this.previewFullscreen.set(false);
    // The previous file's extract must not survive into this one — it is fetched lazily, so a stale value
    // here would show one file's chunks under another file's name until the tab was opened again.
    this.extract.set(null);
    this.extractError.set(null);
    this.loadSelectedMeta(entry);

    // Every preview fetch must carry the auth header — the file endpoint requires it,
    // and a browser-native <img src>/<iframe src> can't send one (that regressed image
    // and PDF previews when the ?token= fallback was scoped to SSE-only, #134). So we
    // fetch with the token and hand the view a same-origin blob: object URL instead.
    const url = this.fileApiUrl(entry);
    const token = this.auth.token();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    if (kind === 'text' || kind === 'markdown') {
      this.previewLoading.set(true);
      fetch(url, { headers })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
        .then(async text => {
          if (kind === 'markdown') {
            // marked → HTML, with any ```mermaid fences rendered to inline SVG; the whole thing is
            // sanitized with DOMPurify and marked trusted (Angular's own sanitizer would strip the SVG).
            const html = await this.renderMarkdown(text);
            // Guard against a fast arrow-key navigation having moved on while mermaid rendered async.
            if (this.previewFile()?.name !== entry.name) return;
            this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
          } else {
            const ext = extOf(entry.name);
            const lang = EXT_LANG[ext] ?? 'plaintext';
            this.previewHtml.set(hljs.highlight(text, { language: lang }).value);
          }
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
    } else if (kind === 'xlsx') {
      this.previewLoading.set(true);
      fetch(url, { headers })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
        .then(async buf => {
          const table = await this.renderXlsx(buf);
          if (this.previewFile()?.name !== entry.name) return; // fast arrow-nav moved on
          this.previewTable.set(table);
          this.previewLoading.set(false);
        })
        .catch((e) => { this.previewError.set(httpErrorReason(e)); this.previewLoading.set(false); });
    }

    document.addEventListener('keydown', this._keyHandler);
    setTimeout(() => this.detailPaneRef()?.nativeElement?.focus());
  }

  /** Space-relative path of an entry (matches the FileMeta `_id`/`path`; leading slashes stripped). */
  /** Public because the template compares it against `requeueingPath()` to disable one row's button. */
  relPath(entry: FileEntry): string {
    return this.join(this.currentPath(), entry.name).replace(/^\/+/, '');
  }

  /** Fetch the file's metadata record so the pane can show its description and (embedded) edit its links. */
  private loadSelectedMeta(entry: FileEntry): void {
    this.selectedMeta.set(null);
    this.metaError.set(null);
    this.filesApi.getFileMeta(this.activeSpaceId(), this.relPath(entry)).subscribe({
      next: (fm) => { this.selectedMeta.set(fm); this.seedMetaModel(fm); },
      // A missing record just means no description/links yet — leave the model empty, not an error.
      error: () => { this.seedMetaModel(null); },
    });
  }

  /** Copy a FileMeta record into the editable form model (and prime chip labels when the picker is present). */
  private seedMetaModel(fm: FileMeta | null): void {
    this.metaEditModel = {
      description: fm?.description ?? '',
      tags: [...(fm?.tags ?? [])],
      entityIds: (fm?.entityIds ?? []).join(', '),
      memoryIds: [...(fm?.memoryIds ?? [])],
      chronoIds: [...(fm?.chronoIds ?? [])],
    };
    this.picker?.resolveEntityNamesFor(this.metaEditModel.entityIds);
    this.picker?.resolveMemoryTitles(this.metaEditModel.memoryIds);
    this.picker?.resolveChronoTitles(this.metaEditModel.chronoIds);
  }

  /** Switch the pane to the file-meta edit face, re-seeding the form from the loaded record. */
  showMetaMode(): void {
    this.seedMetaModel(this.selectedMeta());
    this.metaError.set(null);
    this.detailMode.set('meta');
  }

  /** Discard edits and return to the preview face. */
  cancelMeta(): void {
    this.seedMetaModel(this.selectedMeta());
    this.metaError.set(null);
    this.detailMode.set('preview');
  }

  /** Persist the edited metadata for the open file, then refresh the row (status/tags) via a dir reload. */
  saveMeta(entry: FileEntry): void {
    const path = this.relPath(entry);
    this.metaSaving.set(true);
    this.metaError.set(null);
    this.filesApi.updateFileMeta(this.activeSpaceId(), path, {
      description: this.metaEditModel.description.trim(),
      tags: this.metaEditModel.tags,
      entityIds: this.metaEditModel.entityIds.split(',').map(s => s.trim()).filter(Boolean),
      memoryIds: this.metaEditModel.memoryIds,
      chronoIds: this.metaEditModel.chronoIds,
    }).subscribe({
      next: (fm) => {
        this.selectedMeta.set(fm);
        this.seedMetaModel(fm);
        this.metaSaving.set(false);
        this.detailMode.set('preview');
        this.toast.success(this.transloco.translate('files.detail.metaSaved'));
        this.reloadDir(); // reflect updated tags/status in the list row
      },
      error: (e) => { this.metaError.set(httpErrorReason(e)); this.metaSaving.set(false); },
    });
  }

  /**
   * Can this entry's embedding be re-queued from its row?
   *
   * Not while a job is `pending` or `processing`: the server answers those with a `409`, and an action whose
   * only outcome is a refusal is worse than one that is not offered. A file with no status at all has no job
   * to retry — an upload still in flight, or a type this instance does not embed.
   */
  canRequeue(entry: FileEntry): boolean {
    if (!entry.isFile || !entry.embeddingStatus) return false;
    return entry.embeddingStatus !== 'pending' && entry.embeddingStatus !== 'processing';
  }

  /**
   * Re-queue embedding for one file, from its row or from the open detail pane.
   *
   * One method for both, because they are the same request with the same three outcomes; two copies is how
   * the row would end up with a different toast, or without the list refresh that makes the new status show.
   */
  requeueEmbedding(entry: FileEntry): void {
    const path = this.relPath(entry);
    this.requeueingPath.set(path);
    this.filesApi.retryEmbedding(this.activeSpaceId(), path).subscribe({
      next: () => {
        this.requeueingPath.set('');
        this.toast.success(this.transloco.translate('files.detail.retryQueued'));
        this.reloadDir();
      },
      error: (e) => {
        this.requeueingPath.set('');
        this.toast.error(`${this.transloco.translate('files.detail.retryFailed')} ${httpErrorReason(e)}`.trim());
      },
    });
  }

  /**
   * Render markdown to sanitized HTML, replacing ```mermaid fences with inline SVG.
   *
   * The pipeline itself lives in `MarkdownRenderService` — the Help page renders the shipped docs
   * through the same one, and the sanitization rules are a security boundary that must not exist in two
   * places. This wrapper stays because the preview's tests drive `renderMarkdown` directly.
   */
  private renderMarkdown(text: string): Promise<string> {
    return this.markdown.render(text);
  }

  /**
   * Parse an .xlsx/.xlsm buffer into a capped first-sheet grid. exceljs is heavy, so it's lazy-imported
   * only when a spreadsheet is actually opened. Rows/cols are capped (with a visible note) so a huge sheet
   * can't lock the tab — no silent truncation.
   */
  private async renderXlsx(buf: ArrayBuffer): Promise<XlsxPreview> {
    const mod = await import('exceljs') as unknown as { default?: unknown };
    // exceljs ships a UMD browser build; the workbook factory is the module default (or the namespace).
    const ExcelJS = (mod.default ?? mod) as { Workbook: new () => { xlsx: { load(b: ArrayBuffer): Promise<unknown> }; worksheets: Array<{ name: string; rowCount: number; columnCount: number; getRow(r: number): { getCell(c: number): { value: unknown } } }> } };
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) return { sheet: '', header: [], rows: [], note: this.transloco.translate('files.preview.xlsxEmpty') };

    const totalRows = ws.rowCount, totalCols = ws.columnCount;
    const capRows = Math.min(totalRows, XLSX_MAX_ROWS), capCols = Math.min(totalCols, XLSX_MAX_COLS);
    const grid: string[][] = [];
    for (let r = 1; r <= capRows; r++) {
      const row = ws.getRow(r);
      const cells: string[] = [];
      for (let c = 1; c <= capCols; c++) cells.push(xlsxCellText(row.getCell(c).value));
      grid.push(cells);
    }
    const note = (totalRows > capRows || totalCols > capCols)
      ? this.transloco.translate('files.preview.xlsxTruncated', { rows: capRows, totalRows, cols: capCols, totalCols })
      : null;
    // First row as a header band — the near-universal spreadsheet convention for a quick-look preview.
    return { sheet: ws.name, header: grid[0] ?? [], rows: grid.slice(1), note };
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
      // Full-screen collapses back to the docked pane first; a second Escape closes the pane.
      if (this.previewFullscreen()) { this.previewFullscreen.set(false); return; }
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
    // A poll left running would keep requesting a directory listing for a view nobody is looking at —
    // and, because it reloads through the component's own signals, on a destroyed component.
    this.stopProgressPolling();
  }
}
