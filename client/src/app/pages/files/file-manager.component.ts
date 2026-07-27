import { ChangeDetectionStrategy, Component, inject, signal, OnInit, OnDestroy, HostListener, ElementRef, viewChild, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { Space, FileEntry, FileMeta, UploadProgress } from '../../core/api.types';
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
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
// The docked detail pane reuses the Brain's file-metadata edit fields. These are dumb, shared
// ref-field widgets; they resolve chip labels via EntityRefPicker, which the Brain provides — so the
// "File meta" edit mode is available only when embedded in the Brain (embeddedSpaceId set).
import { TagInputComponent } from '../../shared/tag-input.component';
import { EntityRefFieldComponent } from '../brain/entity-ref-field.component';
import { MemoryRefFieldComponent } from '../brain/memory-ref-field.component';
import { ChronoRefFieldComponent } from '../brain/chrono-ref-field.component';
import { EntityRefPicker } from '../brain/entity-ref-picker.service';
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

type PreviewKind = 'text' | 'markdown' | 'image' | 'pdf' | 'xlsx' | 'unknown';

/** A parsed spreadsheet preview: the first sheet as a capped grid, with a note when truncated. */
interface XlsxPreview { sheet: string; header: string[]; rows: string[][]; note: string | null; }
const XLSX_MAX_ROWS = 200;
const XLSX_MAX_COLS = 40;

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
  imports: [CommonModule, FormsModule, PhIconComponent, TranslocoPipe, ErrorStateComponent, TagInputComponent, EntityRefFieldComponent, MemoryRefFieldComponent, ChronoRefFieldComponent],
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
    .detail-meta-form .field { margin-bottom: 12px; }
    .detail-meta-form label { display: block; margin-bottom: 4px; font-size: 0.8em; color: var(--text-muted); }
    .detail-meta-form textarea { width: 100%; resize: vertical; }
    .detail-meta-actions { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
    /* Full-screen toggle floats at the top-right of the preview body. */
    .preview-body { position: relative; }
    .preview-fs-btn { position: absolute; top: 4px; right: 4px; z-index: 1; opacity: 0.75; }
    .preview-fs-btn:hover { opacity: 1; }
    /* Formatted markdown */
    .md-rendered { line-height: 1.6; word-break: break-word; }
    .md-rendered h1, .md-rendered h2, .md-rendered h3 { margin: 0.8em 0 0.4em; line-height: 1.25; }
    .md-rendered h1 { font-size: 1.5em; } .md-rendered h2 { font-size: 1.3em; } .md-rendered h3 { font-size: 1.12em; }
    .md-rendered p { margin: 0.5em 0; }
    .md-rendered ul, .md-rendered ol { margin: 0.5em 0; padding-left: 1.5em; }
    .md-rendered code { background: var(--bg-muted); padding: 0.1em 0.35em; border-radius: 4px; font-family: var(--font-mono, monospace); font-size: 0.9em; }
    .md-rendered pre { background: var(--bg-muted); padding: 12px; border-radius: 6px; overflow: auto; margin: 0.6em 0; }
    .md-rendered pre code { background: none; padding: 0; }
    .md-rendered a { color: var(--accent, #6ea8fe); }
    .md-rendered blockquote { margin: 0.5em 0; padding-left: 12px; border-left: 3px solid var(--border); color: var(--text-muted); }
    .md-rendered table { border-collapse: collapse; margin: 0.5em 0; }
    .md-rendered th, .md-rendered td { border: 1px solid var(--border); padding: 4px 8px; }
    .md-rendered img { max-width: 100%; }
    .mermaid-diagram { display: flex; justify-content: center; margin: 0.8em 0; }
    .mermaid-diagram svg { max-width: 100%; height: auto; }
    /* xlsx grid preview */
    .xlsx-note { font-size: 0.8em; color: var(--text-muted); margin-bottom: 8px; }
    .xlsx-wrap { overflow: auto; max-width: 100%; }
    .xlsx-grid { border-collapse: collapse; font-size: 0.82em; font-variant-numeric: tabular-nums; }
    .xlsx-grid th, .xlsx-grid td { border: 1px solid var(--border); padding: 3px 8px; text-align: left; white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
    .xlsx-grid th { background: var(--bg-muted); font-weight: 600; position: sticky; top: 0; }
    .xlsx-grid tbody tr:nth-child(even) { background: color-mix(in srgb, var(--bg-muted) 40%, transparent); }
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
                  <th>{{ 'files.table.status' | transloco }}</th>
                  <th>{{ 'files.table.tags' | transloco }}</th>
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
                    <td>
                      @if (entry.isFile && entry.embeddingStatus) {
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
                    <td style="color:var(--text-muted)">{{ entry.modified | date:'dd.MM.yyyy HH:mm' }}</td>
                    <td style="display:flex; gap:6px; align-items:center;">
                      @if (entry.isFile) {
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

          <!-- Docked detail pane: preview + description ⇄ file-meta record (the merged File Meta view).
               The list runs full width until a file is opened; opening one adds this column. -->
          @if (previewFile(); as pf) {
            <div class="fm-detail" tabindex="0" #detailPane>
              <div class="detail-header">
                @if (embeddedSpaceId) {
                  <div class="seg-toggle" role="tablist" [attr.aria-label]="'files.detail.tabsAriaLabel' | transloco">
                    <button type="button" role="tab" [class.active]="detailMode() === 'preview'" [attr.aria-selected]="detailMode() === 'preview'" (click)="detailMode.set('preview')">{{ 'files.detail.previewTab' | transloco }}</button>
                    <button type="button" role="tab" [class.active]="detailMode() === 'meta'" [attr.aria-selected]="detailMode() === 'meta'" (click)="showMetaMode()">{{ 'files.detail.metaTab' | transloco }}</button>
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
                    <ng-container [ngTemplateOutlet]="previewContent" [ngTemplateOutletContext]="{ $implicit: pf }"></ng-container>
                  </div>
                  @if (selectedMeta()?.description) {
                    <div class="detail-desc">
                      <h4>{{ 'files.detail.description' | transloco }}</h4>
                      <p>{{ selectedMeta()!.description }}</p>
                    </div>
                  }
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
                        <button class="btn btn-sm btn-ghost" type="button" [disabled]="retrying()" (click)="retryMeta(pf)">{{ 'brain.fileMeta.retryEmbedding' | transloco }}</button>
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
    <ng-template #previewContent let-pf>
      @if (previewLoading()) {
        <div class="loading-overlay"><span class="spinner"></span></div>
      } @else if (previewError() !== null) {
        <div class="alert alert-error" role="alert">{{ 'files.preview.failed' | transloco }} {{ previewError() }}</div>
      } @else {
        @switch (previewKind()) {
          @case ('markdown') { <div class="md-rendered" [innerHTML]="previewHtml()"></div> }
          @case ('text') { <pre class="preview-code"><code [innerHTML]="previewHtml()"></code></pre> }
          @case ('image') { <img [src]="previewMediaUrl()" [alt]="pf.name" /> }
          @case ('pdf') { <iframe [src]="previewSafeUrl()"></iframe> }
          @case ('xlsx') {
            @if (previewTable(); as t) {
              @if (t.note) { <div class="xlsx-note">{{ t.note }}</div> }
              <div class="xlsx-wrap">
                <table class="xlsx-grid">
                  @if (t.header.length) {
                    <thead><tr>@for (h of t.header; track $index) { <th>{{ h }}</th> }</tr></thead>
                  }
                  <tbody>
                    @for (row of t.rows; track $index) {
                      <tr>@for (cell of row; track $index) { <td>{{ cell }}</td> }</tr>
                    }
                  </tbody>
                </table>
              </div>
            }
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
    </ng-template>

    <!-- Full-screen preview overlay (the one intentional fixed overlay — for the full-screen button). -->
    @if (previewFullscreen() && previewFile(); as pf) {
      <div class="preview-fs-overlay" tabindex="0" #fsOverlay>
        <div class="preview-fs-bar">
          <span class="file-title" [title]="pf.name">{{ pf.name }}</span>
          <button class="icon-btn" (click)="previewFullscreen.set(false)" [attr.aria-label]="'files.preview.exitFullscreen' | transloco"><ph-icon name="x" [size]="18"/></button>
        </div>
        <div class="preview-fs-body preview-body">
          <ng-container [ngTemplateOutlet]="previewContent" [ngTemplateOutletContext]="{ $implicit: pf }"></ng-container>
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
  private detailPaneRef = viewChild<ElementRef<HTMLDivElement>>('detailPane');
  // Brain-provided (only present when embedded in the Brain). Optional so the standalone /files route,
  // where the Brain injector isn't in the tree, still constructs — there the meta edit mode is hidden.
  private picker = inject(EntityRefPicker, { optional: true });

  /** When set (embedded in brain), skip space loading and use this space. */
  @Input() embeddedSpaceId = '';

  /** Fires whenever the file set in this space changes (delete or upload complete) so the host can refresh counts. */
  @Output() filesChanged = new EventEmitter<void>();

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
  /** Blob object URL backing the current image/PDF preview; revoked on close/next. */
  private _previewObjectUrl: string | null = null;
  /** True while the preview is expanded to a full-screen overlay (Escape collapses it first). */
  previewFullscreen = signal(false);

  // ── Docked detail-pane state (preview+description ⇄ file-meta record) ──────
  /** Which face of the detail pane is showing. Meta editing is only reachable when embedded. */
  detailMode = signal<'preview' | 'meta'>('preview');
  /** The FileMeta record for the open file (its description + links); null until the fetch lands. */
  selectedMeta = signal<FileMeta | null>(null);
  /** Edit model for the meta form — same shape the Brain File Meta tab uses (entityIds is comma-joined
   *  for app-entity-ref-field; memory/chrono are id arrays). Mutated in place by the ref-field widgets. */
  metaEditModel = { description: '', tags: [] as string[], entityIds: '', memoryIds: [] as string[], chronoIds: [] as string[] };
  metaSaving = signal(false);
  metaError = signal<string | null>(null);
  /** True while a retry-embedding request for the open file is in flight. */
  retrying = signal(false);

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
    this.previewTable.set(null);
    // Selecting a file always shows the preview face first; the meta record loads alongside so the
    // description shows here and the (embedded-only) edit form is ready when the toggle is used.
    this.detailMode.set('preview');
    this.previewFullscreen.set(false);
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
  private relPath(entry: FileEntry): string {
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

  /** Re-queue embedding for the open file (shown only when its status is failed/partial). */
  retryMeta(entry: FileEntry): void {
    this.retrying.set(true);
    this.filesApi.retryEmbedding(this.activeSpaceId(), this.relPath(entry)).subscribe({
      next: () => {
        this.retrying.set(false);
        this.toast.success(this.transloco.translate('files.detail.retryQueued'));
        this.reloadDir();
      },
      error: (e) => { this.retrying.set(false); this.toast.error(`${this.transloco.translate('files.detail.retryFailed')} ${httpErrorReason(e)}`.trim()); },
    });
  }

  /**
   * Render markdown to sanitized HTML, replacing ```mermaid fences with inline SVG.
   *
   * mermaid is heavy, so it's lazy-imported and only when a diagram is actually present. The final
   * HTML — prose plus any mermaid SVG — is sanitized with DOMPurify (mermaid runs in `strict` mode too),
   * then marked trusted; Angular's own HTML sanitizer would otherwise strip the SVG.
   */
  private async renderMarkdown(text: string): Promise<string> {
    const mermaidSources: string[] = [];
    const md = new Marked({
      renderer: {
        code({ text: code, lang }) {
          if ((lang ?? '').trim().toLowerCase() === 'mermaid') {
            const i = mermaidSources.length;
            mermaidSources.push(code);
            return `<div class="mermaid-slot" data-idx="${i}"></div>`;
          }
          return false; // fall through to marked's default code renderer
        },
      },
    });
    let html = md.parse(text, { async: false }) as string;

    if (mermaidSources.length) {
      try {
        const mermaid = (await import('mermaid')).default;
        // htmlLabels:false → labels render as native SVG <text>, not <foreignObject> HTML. That keeps the
        // labels through DOMPurify's SVG sanitization (which strips foreignObject) and removes the
        // foreignObject XSS surface entirely.
        mermaid.initialize({
          startOnLoad: false, securityLevel: 'strict', theme: 'dark', htmlLabels: false,
          flowchart: { htmlLabels: false },
        });
        for (let i = 0; i < mermaidSources.length; i++) {
          const slot = `<div class="mermaid-slot" data-idx="${i}"></div>`;
          try {
            const { svg } = await mermaid.render(`fm-mmd-${Date.now()}-${i}`, mermaidSources[i]);
            html = html.replace(slot, `<div class="mermaid-diagram">${svg}</div>`);
          } catch {
            // Invalid diagram → show its source rather than breaking the whole preview.
            html = html.replace(slot, `<pre class="preview-code"><code>${escapeHtml(mermaidSources[i])}</code></pre>`);
          }
        }
      } catch {
        // mermaid failed to load — leave the empty slots; the surrounding prose still renders.
      }
    }

    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true, svg: true, svgFilters: true }, ADD_TAGS: ['foreignObject'] });
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
  }
}
