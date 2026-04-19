import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Input,
  inject,
  signal,
  computed,
  viewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import cytoscape from 'cytoscape';
import {
  ApiService,
  Space,
  Entity,
  Memory,
  ChronoEntry,
  Edge,
  TraverseNode,
  TraverseEdge,
  TraverseResult,
} from '../../core/api.service';
import { EntryPopupComponent } from '../../shared/entry-popup.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';

// ── Deterministic colour palette for node types ──────────────────────────────

const TYPE_COLORS = [
  '#7c6af7', '#58a6ff', '#3fb950', '#d29922', '#f85149',
  '#e38625', '#9580ff', '#79c0ff', '#56d364', '#e3b341',
];

function typeColor(type: string): string {
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) | 0;
  return TYPE_COLORS[Math.abs(hash) % TYPE_COLORS.length];
}

// ── Helper types ─────────────────────────────────────────────────────────────

interface DetailRow {
  id: string;
  kind: 'memory' | 'chrono';
  description: string;
  tags: string[];
  properties: Record<string, unknown>;
  createdAt: string;
  raw: Record<string, unknown>;
}

@Component({
  selector: 'app-graph-view',
  standalone: true,
  imports: [CommonModule, FormsModule, EntryPopupComponent, EntitySearchComponent, PropertiesViewComponent],
  host: { '[class.embedded]': 'isEmbedded()' },
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 56px - 56px);
      min-height: 0;
      gap: 8px;
    }
    :host.embedded {
      height: 70vh;
      min-height: 400px;
    }

    /* ── Space chips (matches brain style) ─────────────────────────────────── */
    .space-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
      flex-shrink: 0;
    }
    .space-chip {
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--border);
      background: var(--bg-surface);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      min-width: 90px;
      white-space: nowrap;
    }
    .space-chip:hover { border-color: var(--accent); color: var(--text-primary); }
    .space-chip.active {
      background: var(--accent-dim);
      border-color: var(--accent);
      color: var(--accent);
    }
    .space-chip-label { font-size: 12px; font-weight: 500; }
    .space-chip-id { font-size: 10px; color: var(--text-muted); }
    .space-chip.active .space-chip-id { color: var(--accent); opacity: 0.7; }

    /* ── Toolbar ───────────────────────────────────────────────────────────── */

    .graph-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .graph-toolbar select,
    .graph-toolbar input[type="search"],
    .graph-toolbar input[type="text"] {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: var(--font);
      font-size: 13px;
      padding: 6px 10px;
      outline: none;
      transition: border-color var(--transition);
    }
    .graph-toolbar select:focus,
    .graph-toolbar input:focus {
      border-color: var(--accent);
    }

    .graph-toolbar select { min-width: 140px; }

    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 200px;
      max-width: 360px;
    }

    .toolbar-divider {
      width: 1px;
      height: 22px;
      background: var(--border);
      flex-shrink: 0;
    }
    .toolbar-spacer { flex: 1; }
    .toolbar-label {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .depth-control {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .depth-control input[type="range"] {
      accent-color: var(--accent);
      width: 80px;
      cursor: pointer;
    }
    .depth-value {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-primary);
      min-width: 14px;
      text-align: center;
    }

    .pill-group {
      display: flex;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      flex-shrink: 0;
    }
    .pill-group button {
      padding: 5px 12px;
      font-size: 12px;
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: none;
      cursor: pointer;
      transition: background var(--transition), color var(--transition);
      white-space: nowrap;
    }
    .pill-group button + button { border-left: 1px solid var(--border); }
    .pill-group button.active {
      background: var(--accent-dim);
      color: var(--accent);
    }
    .pill-group button:hover:not(.active) {
      background: var(--bg-overlay);
      color: var(--text-primary);
    }

    .toolbar-toggle {
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      white-space: nowrap;
    }
    .toolbar-toggle input[type="checkbox"] { accent-color: var(--accent); }

    .toolbar-btn {
      padding: 5px 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
      transition: border-color var(--transition), color var(--transition), background var(--transition);
    }
    .toolbar-btn:hover {
      border-color: var(--accent);
      color: var(--text-primary);
      background: var(--accent-dim);
    }
    .graph-stats {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      font-family: var(--font-mono);
    }

    /* ── Canvas zone ──────────────────────────────────────────────────────── */

    .canvas-row {
      display: flex;
      flex: 1;
      min-height: 0;
      gap: 8px;
    }

    .canvas-zone {
      position: relative;
      flex: 1;
      min-height: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      overflow: hidden;
    }

    .cy-container {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
    }

    .truncation-banner {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: var(--error-dim);
      border: 1px solid var(--error);
      border-radius: var(--radius-sm);
      color: var(--warning);
      font-size: 13px;
      white-space: nowrap;
    }
    .truncation-banner button {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 14px;
      cursor: pointer;
      padding: 0 2px;
    }

    .canvas-empty {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      gap: 8px;
    }
    .empty-icon {
      font-size: 52px;
      line-height: 1;
      opacity: 0.2;
    }
    .canvas-empty h3 {
      color: var(--text-muted);
      font-weight: 500;
      font-size: 15px;
      margin: 0;
    }
    .canvas-empty p {
      color: var(--text-muted);
      font-size: 13px;
      margin: 0;
      opacity: 0.7;
    }

    /* Loading overlay */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.25);
      z-index: 30;
      backdrop-filter: blur(2px);
    }
    .loading-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(124, 106, 247, 0.25);
      border-top-color: #7c6af7;
      border-radius: 50%;
      animation: graph-spin 0.75s linear infinite;
    }
    @keyframes graph-spin { to { transform: rotate(360deg); } }

    /* ── Side panel (shown when node or edge selected) ───────────────────── */

    .side-panel {
      width: 560px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      overflow: hidden;
      min-height: 0;
    }

    .side-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      gap: 8px;
    }
    .side-panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .side-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .side-panel-title h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .side-panel-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    /* Side panel body: two columns */
    .side-panel-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* Left column: record card */
    .record-card {
      flex: 0 0 50%;
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 12px 14px;
    }

    /* Drawer fields (same pattern as brain component) */
    .drawer-field { margin-bottom: 14px; }
    .drawer-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .drawer-value {
      font-size: 12px;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.5;
    }
    .drawer-muted { color: var(--text-muted); }
    .drawer-hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
    .drawer-readonly-value {
      font-size: 12px;
      color: var(--text-muted);
      padding: 4px 8px;
      border: 1px solid var(--border-muted, var(--border));
      border-radius: var(--radius-sm);
      background: var(--bg-elevated);
      word-break: break-all;
      line-height: 1.4;
    }
    .drawer-tag {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 11px;
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border);
      margin: 2px 3px 2px 0;
    }

    /* Right column: memory + chrono lists */
    .lists-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }
    .list-section {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      border-bottom: 1px solid var(--border);
    }
    .list-section:last-child { border-bottom: none; }
    .list-section-header {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 12px 6px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .list-section-header .count-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--bg-overlay);
      border-radius: 8px;
      font-size: 10px;
      color: var(--text-muted);
    }
    .list-body { overflow-y: auto; flex: 1; }
    .list-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      transition: background var(--transition);
    }
    .list-row:last-child { border-bottom: none; }
    .list-row:hover { background: var(--bg-elevated); }
    .list-row-text {
      flex: 1;
      font-size: 12px;
      color: var(--text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .list-row-date {
      font-size: 10px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .list-empty {
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      padding: 16px 12px;
    }

    /* ── Shared badge, button helpers ──────────────────────────────────────── */
    .tag {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 11px;
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border: 1px solid var(--border);
      margin-right: 3px;
    }
  `],
  template: `
    <!-- ═══ Space selector ══════════════════════════════════════════════════ -->
    @if (!isEmbedded() && spaces().length > 0) {
      <div class="space-tabs">
        @for (s of spaces(); track s.id) {
          <button class="space-chip" [class.active]="activeSpaceId() === s.id" (click)="onSpaceChange(s.id)">{{ s.label }}</button>
        }
      </div>
    }

    <!-- ═══ Toolbar ════════════════════════════════════════════════════════ -->
    <div class="graph-toolbar">
      <div class="search-wrapper">
        <app-entity-search
          mode="bar"
          [spaceId]="activeSpaceId()"
          placeholder="🔍  Search entity…"
          defaultMode="semantic"
          (selected)="selectRoot($event)"
          (queryChange)="onSearchQueryChange($event)"
        />
      </div>

      <div class="toolbar-divider"></div>

      <div class="depth-control">
        <span class="toolbar-label">Depth</span>
        <input type="range" min="1" max="10" [ngModel]="depth()" (ngModelChange)="onDepthChange($event)" />
        <span class="depth-value">{{ depth() }}</span>
      </div>

      <div class="pill-group">
        <button [class.active]="direction() === 'outbound'" (click)="setDirection('outbound')">Out</button>
        <button [class.active]="direction() === 'inbound'" (click)="setDirection('inbound')">In</button>
        <button [class.active]="direction() === 'both'"    (click)="setDirection('both')">Both</button>
      </div>

      <div class="pill-group">
        <button [class.active]="!hideLabels()" (click)="onHideLabelsChange(!hideLabels())" title="Toggle edge labels">Labels</button>
      </div>

      <div class="toolbar-spacer"></div>

      @if (rootEntity()) {
        <span class="graph-stats">{{ nodeCount() }} nodes · {{ edgeCount() }} edges</span>
      }
      <button class="toolbar-btn" title="Fit to viewport" (click)="fitGraph()">⛶</button>
      <button class="toolbar-btn" title="Reset graph"     (click)="resetGraph()">↺</button>
    </div>

    <!-- ═══ Canvas row (canvas + optional side panel) ══════════════════════ -->
    <div class="canvas-row">

      <!-- ── Canvas zone ────────────────────────────────────────────────── -->
      <div class="canvas-zone">
        @if (truncated()) {
          <div class="truncation-banner">
            ⚠ Result truncated — reduce depth or node limit to see full graph
            <button (click)="truncated.set(false)">✕</button>
          </div>
        }

        @if (loading()) {
          <div class="loading-overlay"><div class="loading-spinner"></div></div>
        }

        @if (!rootEntity() && !loading()) {
          <div class="canvas-empty">
            <div class="empty-icon">◎</div>
            <h3>Search for an entity to start exploring</h3>
            <p>Tap nodes to inspect · double-tap to re-root</p>
          </div>
        }

        <div #cyContainer class="cy-container" [style.visibility]="rootEntity() ? 'visible' : 'hidden'"></div>
      </div>

      <!-- ── Side panel (node selected) ────────────────────────────────── -->
      @if (selectedNode()) {
        <div class="side-panel">
          <div class="side-panel-header">
            <div class="side-panel-title">
              <span class="side-dot" [style.background]="panelColor()"></span>
              <h3>{{ selectedNode()!.name }}</h3>
              <span class="badge">{{ selectedNode()!.type || 'entity' }}</span>
            </div>
            <div class="side-panel-header-actions">
              <button class="btn btn-sm btn-ghost" (click)="openEntityPopup(selectedNode()!)">👁</button>
              <button class="icon-btn" title="Close" (click)="selectedNode.set(null)">✕</button>
            </div>
          </div>
          <div class="side-panel-body">

            <!-- Record card -->
            <div class="record-card">
              @if (selectedEntityRecord()) {
                <div class="drawer-field">
                  <div class="drawer-label">name</div>
                  <div class="drawer-value">{{ selectedEntityRecord()!.name }}</div>
                </div>
                @if (selectedEntityRecord()!.type) {
                  <div class="drawer-field">
                    <div class="drawer-label">type</div>
                    <div class="drawer-value">{{ selectedEntityRecord()!.type }}</div>
                  </div>
                }
                @if (selectedEntityRecord()!.description) {
                  <div class="drawer-field">
                    <div class="drawer-label">description</div>
                    <div class="drawer-value">{{ selectedEntityRecord()!.description }}</div>
                  </div>
                }
                @if (selectedEntityRecord()!.tags?.length) {
                  <div class="drawer-field">
                    <div class="drawer-label">tags</div>
                    <div>
                      @for (t of selectedEntityRecord()!.tags!; track t) {
                        <span class="drawer-tag">{{ t }}</span>
                      }
                    </div>
                  </div>
                }
                @if (selectedEntityRecord()!.properties && objectKeys(selectedEntityRecord()!.properties!).length) {
                  <div class="drawer-field">
                    <div class="drawer-label">properties</div>
                    <app-properties-view [properties]="selectedEntityRecord()!.properties!" />
                  </div>
                }
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ selectedEntityRecord()!._id }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">createdAt</div>
                  <div class="drawer-readonly-value">{{ selectedEntityRecord()!.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
                </div>
              } @else {
                <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">Loading…</div>
              }
            </div>

            <!-- Lists pane: memories + chrono -->
            <div class="lists-pane">
              <div class="list-section">
                <div class="list-section-header">
                  Memories <span class="count-chip">{{ nodeMemories().length }}</span>
                </div>
                <div class="list-body">
                  @for (m of nodeMemories(); track m._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: m._id, kind: 'memory', description: m.fact || m.description || '', tags: m.tags ?? [], properties: {}, createdAt: m.createdAt, raw: asRecord(m) })">
                      <span class="list-row-text" [title]="m.fact || m.description">{{ m.fact || m.description || '—' }}</span>
                      <span class="list-row-date">{{ m.createdAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">No memories</div>
                  }
                </div>
              </div>
              <div class="list-section">
                <div class="list-section-header">
                  Chrono <span class="count-chip">{{ nodeChrono().length }}</span>
                </div>
                <div class="list-body">
                  @for (c of nodeChrono(); track c._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: c._id, kind: 'chrono', description: c.title || c.description || '', tags: c.tags ?? [], properties: {}, createdAt: c.createdAt, raw: asRecord(c) })">
                      <span class="list-row-text" [title]="c.title || c.description">{{ c.title || c.description || '—' }}</span>
                      <span class="list-row-date">{{ c.startsAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">No chrono entries</div>
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      }

      <!-- ── Side panel (edge selected) ────────────────────────────────── -->
      @if (selectedEdge()) {
        <div class="side-panel">
          <div class="side-panel-header">
            <div class="side-panel-title">
              <span class="side-dot" [style.background]="panelColor()"></span>
              <h3>{{ selectedEdge()!.label || 'edge' }}</h3>
              <span class="badge">edge</span>
            </div>
            <div class="side-panel-header-actions">
              @if (selectedEdgeRecord()) {
                <button class="btn btn-sm btn-ghost" (click)="popupRecord.set(asRecord(selectedEdgeRecord()!)); popupType.set('edge')">👁</button>
              }
              <button class="icon-btn" title="Close" (click)="selectedEdge.set(null); selectedEdgeRecord.set(null)">✕</button>
            </div>
          </div>
          <div class="side-panel-body">

            <!-- Edge record card -->
            <div class="record-card">
              @if (selectedEdgeRecord()) {
                <div class="drawer-field">
                  <div class="drawer-label">label</div>
                  <div class="drawer-value">{{ selectedEdgeRecord()!.label }}</div>
                </div>
                @if (selectedEdgeRecord()!.type) {
                  <div class="drawer-field">
                    <div class="drawer-label">type</div>
                    <div class="drawer-value">{{ selectedEdgeRecord()!.type }}</div>
                  </div>
                }
                @if (selectedEdgeRecord()!.description) {
                  <div class="drawer-field">
                    <div class="drawer-label">description</div>
                    <div class="drawer-value">{{ selectedEdgeRecord()!.description }}</div>
                  </div>
                }
                @if (selectedEdgeRecord()!.weight !== undefined && selectedEdgeRecord()!.weight !== null) {
                  <div class="drawer-field">
                    <div class="drawer-label">weight</div>
                    <div class="drawer-value">{{ selectedEdgeRecord()!.weight }}</div>
                  </div>
                }
                @if (selectedEdgeRecord()!.tags?.length) {
                  <div class="drawer-field">
                    <div class="drawer-label">tags</div>
                    <div>
                      @for (t of selectedEdgeRecord()!.tags!; track t) {
                        <span class="drawer-tag">{{ t }}</span>
                      }
                    </div>
                  </div>
                }
                @if (selectedEdgeRecord()!.properties && objectKeys(selectedEdgeRecord()!.properties!).length) {
                  <div class="drawer-field">
                    <div class="drawer-label">properties</div>
                    <app-properties-view [properties]="selectedEdgeRecord()!.properties!" />
                  </div>
                }
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">from</div>
                  <div class="drawer-readonly-value">{{ selectedEdgeRecord()!.fromName || selectedEdge()!.from }}</div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">to</div>
                  <div class="drawer-readonly-value">{{ selectedEdgeRecord()!.toName || selectedEdge()!.to }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ selectedEdgeRecord()!._id }}</div>
                </div>
              } @else {
                <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">Loading…</div>
              }
            </div>

            <!-- Lists pane: memories + chrono for both endpoints -->
            <div class="lists-pane">
              <div class="list-section">
                <div class="list-section-header">
                  Memories <span class="count-chip">{{ nodeMemories().length }}</span>
                </div>
                <div class="list-body">
                  @for (m of nodeMemories(); track m._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: m._id, kind: 'memory', description: m.fact || m.description || '', tags: m.tags ?? [], properties: {}, createdAt: m.createdAt, raw: asRecord(m) })">
                      <span class="list-row-text" [title]="m.fact || m.description">{{ m.fact || m.description || '—' }}</span>
                      <span class="list-row-date">{{ m.createdAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">No linked memories</div>
                  }
                </div>
              </div>
              <div class="list-section">
                <div class="list-section-header">
                  Chrono <span class="count-chip">{{ nodeChrono().length }}</span>
                </div>
                <div class="list-body">
                  @for (c of nodeChrono(); track c._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: c._id, kind: 'chrono', description: c.title || c.description || '', tags: c.tags ?? [], properties: {}, createdAt: c.createdAt, raw: asRecord(c) })">
                      <span class="list-row-text" [title]="c.title || c.description">{{ c.title || c.description || '—' }}</span>
                      <span class="list-row-date">{{ c.startsAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">No linked chrono</div>
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      }

    </div><!-- /canvas-row -->

    <!-- ═══ Entry popup ══════════════════════════════════════════════════ -->
    @if (popupRecord()) {
      <app-entry-popup
        [record]="popupRecord()"
        [recordType]="popupType()"
        [spaceId]="activeSpaceId()"
        [canEdit]="canEdit()"
        (closed)="closePopup()"
        (saved)="onPopupSaved($event)"
      />
    }
  `,
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy {
  // ── DI ──────────────────────────────────────────────────────────────────────
  private api = inject(ApiService);
  private location = inject(Location);
  private route = inject(ActivatedRoute);

  // ── Element refs ────────────────────────────────────────────────────────────
  cyContainer = viewChild<ElementRef<HTMLDivElement>>('cyContainer');

  // ── Embedded input ──────────────────────────────────────────────────────────
  @Input() set embeddedSpaceId(v: string | undefined) {
    if (v !== undefined) {
      this.isEmbedded.set(true);
      const changed = this.activeSpaceId() !== v;
      this.activeSpaceId.set(v);
      if (changed && this.cy) this.resetGraph();
    }
  }

  // ── State signals ───────────────────────────────────────────────────────────
  isEmbedded = signal(false);

  spaces = signal<Space[]>([]);
  activeSpaceId = signal('');
  searchQuery = signal('');

  rootEntity = signal<Entity | null>(null);
  depth = signal(3);
  direction = signal<'outbound' | 'inbound' | 'both'>('both');
  hideLabels = signal(false);
  truncated = signal(false);

  selectedNode = signal<TraverseNode | null>(null);
  selectedEntityRecord = signal<Entity | null>(null);
  selectedEdge = signal<TraverseEdge | null>(null);
  selectedEdgeRecord = signal<Edge | null>(null);
  nodeMemories = signal<Memory[]>([]);
  nodeChrono = signal<ChronoEntry[]>([]);

  detailTypeFilter = signal<'all' | 'memory' | 'chrono'>('all');
  detailDescFilter = signal('');
  sortField = signal<'description' | 'createdAt'>('createdAt');
  sortAsc = signal(false);

  nodeCount = signal(0);
  edgeCount = signal(0);

  popupRecord = signal<Record<string, unknown> | null>(null);
  popupType = signal<'entity' | 'edge' | 'memory' | 'chrono'>('entity');
  canEdit = signal(false);

  loading = signal(false);

  // ── Computed ────────────────────────────────────────────────────────────────
  allDetails = computed<DetailRow[]>(() => {
    const mems: DetailRow[] = this.nodeMemories().map(m => ({
      id: m._id,
      kind: 'memory' as const,
      description: m.fact || m.description || '',
      tags: m.tags ?? [],
      properties: (m.properties ?? {}) as Record<string, unknown>,
      createdAt: m.createdAt,
      raw: m as unknown as Record<string, unknown>,
    }));
    const chrs: DetailRow[] = this.nodeChrono().map(c => ({
      id: c._id,
      kind: 'chrono' as const,
      description: c.title || c.description || '',
      tags: c.tags ?? [],
      properties: {} as Record<string, unknown>,
      createdAt: c.createdAt,
      raw: c as unknown as Record<string, unknown>,
    }));
    return [...mems, ...chrs];
  });

  filteredDetails = computed<DetailRow[]>(() => {
    let rows = this.allDetails();
    const tf = this.detailTypeFilter();
    if (tf !== 'all') rows = rows.filter(r => r.kind === tf);
    const df = this.detailDescFilter().toLowerCase();
    if (df) rows = rows.filter(r => r.description.toLowerCase().includes(df));
    const field = this.sortField();
    const asc = this.sortAsc();
    rows = [...rows].sort((a, b) => {
      const va = field === 'description' ? a.description.toLowerCase() : a.createdAt;
      const vb = field === 'description' ? b.description.toLowerCase() : b.createdAt;
      return asc ? (va < vb ? -1 : va > vb ? 1 : 0)
                 : (va > vb ? -1 : va < vb ? 1 : 0);
    });
    return rows;
  });

  nodeColor = computed(() => {
    const n = this.selectedNode();
    return n ? typeColor(n.type || 'default') : '#8b949e';
  });

  panelTitle = computed(() => {
    const n = this.selectedNode();
    if (n) return n.name;
    const e = this.selectedEdge();
    if (e) return e.label || 'edge';
    return '';
  });

  panelColor = computed(() => {
    const n = this.selectedNode();
    if (n) return typeColor(n.type || 'default');
    const e = this.selectedEdgeRecord();
    if (e) return typeColor(e.label || 'edge');
    return '#8b949e';
  });

  // ── Private state ───────────────────────────────────────────────────────────
  private cy: any = null;
  private subs = new Subscription();

  // Currently rendered (depth-filtered) view
  private graphNodes: TraverseNode[] = [];
  private graphEdges: TraverseEdge[] = [];

  // Full-depth traversal cache — avoids re-fetching shallower depths
  private cacheStartId: string | null = null;
  private cacheDirection: 'outbound' | 'inbound' | 'both' | null = null;
  private cacheMaxDepth = 0;
  private cacheNodes: TraverseNode[] = [];
  private cacheEdges: TraverseEdge[] = [];
  private cacheTruncated = false;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Load spaces only in standalone mode; in embedded mode the space is injected via @Input
    if (!this.isEmbedded()) {
      this.api.listSpaces().subscribe(res => {
        this.spaces.set(res.spaces);
        const qp = this.route.snapshot.queryParams;
        const initial = qp['space'] || (res.spaces.length ? res.spaces[0].id : '');
        this.activeSpaceId.set(initial);

        // If entity query-param present, load it as root
        if (qp['entity'] && initial) {
          this.api.getEntity(initial, qp['entity']).pipe(
            catchError(() => of(null)),
          ).subscribe(ent => {
            if (ent) this.selectRoot(ent);
          });
        }
      });
    }

    this.api.getMe().pipe(catchError(() => of(null))).subscribe(me => {
      this.canEdit.set(me ? !me.readOnly : false);
    });
  }

  ngAfterViewInit(): void {
    this.initCytoscape();

    // Watch direction / depth / hideLabels changes via effect
    // Using effect in AfterViewInit requires the injection context to still be active
    // so we'll use subscriptions on signals via polling or explicit calls.
    // The signals are updated via template bindings and we trigger traverse from those handlers.
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }

  // ── Cytoscape init ──────────────────────────────────────────────────────────

  private initCytoscape(): void {
    const container = this.cyContainer()?.nativeElement;
    if (!container) return;

    // Glass shine SVG — radial highlight in upper-left quadrant
    const glassShineSvg = (color: string) => {
      const c = encodeURIComponent(color);
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><radialGradient id='base' cx='50%25' cy='50%25' r='50%25'><stop offset='0%25' stop-color='${c}' stop-opacity='0.28'/><stop offset='100%25' stop-color='${c}' stop-opacity='0.06'/></radialGradient><radialGradient id='shine' cx='30%25' cy='22%25' r='50%25'><stop offset='0%25' stop-color='white' stop-opacity='0.55'/><stop offset='45%25' stop-color='white' stop-opacity='0.12'/><stop offset='100%25' stop-color='white' stop-opacity='0'/></radialGradient><radialGradient id='rim' cx='50%25' cy='50%25' r='50%25'><stop offset='68%25' stop-color='${c}' stop-opacity='0'/><stop offset='100%25' stop-color='${c}' stop-opacity='0.7'/></radialGradient><radialGradient id='bot' cx='58%25' cy='80%25' r='38%25'><stop offset='0%25' stop-color='${c}' stop-opacity='0.18'/><stop offset='100%25' stop-color='${c}' stop-opacity='0'/></radialGradient></defs><circle cx='50' cy='50' r='49' fill='url(%23base)'/><circle cx='50' cy='50' r='49' fill='url(%23rim)'/><circle cx='50' cy='50' r='49' fill='url(%23bot)'/><circle cx='50' cy='50' r='49' fill='url(%23shine)'/></svg>`;
    };

    this.cy = cytoscape({
      container,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'width': (ele: any) => { const d = +ele.data('depth'); return d === 0 ? 68 : Math.max(36, 52 - d * 3); },
            'height': (ele: any) => { const d = +ele.data('depth'); return d === 0 ? 68 : Math.max(36, 52 - d * 3); },
            'background-color': '#0d1117',
            'background-image': (ele: any) => glassShineSvg(typeColor(ele.data('type') || 'default')),
            'background-fit': 'cover',
            'background-clip': 'node',
            'border-width': (ele: any) => +ele.data('depth') === 0 ? 2.5 : 1.5,
            'border-color': (ele: any) => typeColor(ele.data('type') || 'default'),
            'border-opacity': 0.75,
            'label': 'data(label)',
            'font-size': (ele: any) => +ele.data('depth') === 0 ? 13 : 11,
            'font-weight': (ele: any) => +ele.data('depth') === 0 ? '600' : '400',
            'color': '#c9d1d9',
            'text-outline-color': '#0d1117',
            'text-outline-width': 2,
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'text-max-width': '110px',
            'text-wrap': 'ellipsis',
            'opacity': (ele: any) => { const d = +ele.data('depth'); return d === 0 ? 1 : Math.max(0.55, 1 - d * 0.1); },
            'shadow-blur': (ele: any) => +ele.data('depth') === 0 ? 28 : 14,
            'shadow-color': (ele: any) => typeColor(ele.data('type') || 'default'),
            'shadow-opacity': (ele: any) => +ele.data('depth') === 0 ? 0.6 : 0.35,
            'shadow-offset-x': 0,
            'shadow-offset-y': 0,
          } as any,
        },
        {
          selector: 'node.root',
          style: {
            'border-color': '#7c6af7',
            'border-width': 3,
            'border-opacity': 1,
          } as any,
        },
        {
          selector: 'node.hovered',
          style: {
            'border-width': 2.5,
            'border-opacity': 1,
            'opacity': 1,
            'shadow-blur': 30,
            'shadow-opacity': 0.8,
          } as any,
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#58a6ff',
            'border-width': 3,
            'border-opacity': 1,
            'opacity': 1,
            'shadow-blur': 36,
            'shadow-color': '#58a6ff',
            'shadow-opacity': 0.9,
          } as any,
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#3d444d',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#3d444d',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': 10,
            'color': '#6e7681',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'text-background-color': '#0d1117',
            'text-background-opacity': 0.7,
            'text-background-padding': '2px',
            'opacity': 0.75,
          } as any,
        },
        {
          selector: 'edge.hovered',
          style: {
            'line-color': '#58a6ff',
            'target-arrow-color': '#58a6ff',
            'opacity': 1,
            'width': 2.5,
          } as any,
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#7c6af7',
            'target-arrow-color': '#7c6af7',
            'opacity': 1,
          } as any,
        },
        {
          selector: 'edge.hide-labels',
          style: {
            'label': '',
          } as any,
        },
      ],
      layout: { name: 'grid' },
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.25,
    });

    // Node tap → select + show detail panel
    this.cy.on('tap', 'node', (evt: any) => {
      const node = evt.target;
      const id = node.data('id');
      // graphNodes does NOT include the root node (added separately in renderGraph)
      let tn = this.graphNodes.find(n => n._id === id);
      if (!tn) {
        const root = this.rootEntity();
        if (root && root._id === id) {
          tn = { _id: root._id, name: root.name, type: root.type || 'default', depth: 0, description: root.description, tags: root.tags };
        }
      }
      if (tn) {
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
        this.selectedEntityRecord.set(null);
        this.selectedNode.set(tn);
        this.loadNodeDetails(id);
      }
    });

    // Edge tap → show edge side panel
    this.cy.on('tap', 'edge', (evt: any) => {
      const edgeId = evt.target.data('id');
      const te = this.graphEdges.find(e => e._id === edgeId);
      if (te) {
        this.selectedNode.set(null);
        this.selectedEdge.set(te);
        this.loadEdgeDetails(te);
      }
    });

    // Double-tap node → re-root
    this.cy.on('dbltap', 'node', (evt: any) => {
      const id = evt.target.data('id');
      const spaceId = this.activeSpaceId();
      if (!spaceId) return;
      this.api.getEntity(spaceId, id).pipe(
        catchError(() => of(null)),
      ).subscribe(ent => {
        if (ent) this.selectRoot(ent, true);
      });
    });

    // Hover effects
    this.cy.on('mouseover', 'node', (evt: any) => { evt.target.addClass('hovered'); });
    this.cy.on('mouseout',  'node', (evt: any) => { evt.target.removeClass('hovered'); });
    this.cy.on('mouseover', 'edge', (evt: any) => { evt.target.addClass('hovered'); });
    this.cy.on('mouseout',  'edge', (evt: any) => { evt.target.removeClass('hovered'); });

    // Background tap → deselect
    this.cy.on('tap', (evt: any) => {
      if (evt.target === this.cy) {
        this.selectedNode.set(null);
        this.selectedEdge.set(null);
        this.selectedEdgeRecord.set(null);
      }
    });
  }

  // ── Toolbar handlers ────────────────────────────────────────────────────────

  onSearchQueryChange(q: string): void {
    this.searchQuery.set(q);
  }

  onSpaceChange(spaceId: string): void {
    this.activeSpaceId.set(spaceId);
    this.resetGraph();
  }

  onSearchInput(query: string): void {
    this.searchQuery.set(query);
  }

  onDepthChange(val: number | string): void {
    this.depth.set(+val);
    if (this.rootEntity()) {
      this.traverse(this.rootEntity()!._id, +val, this.direction());
    }
  }

  setDirection(dir: 'outbound' | 'inbound' | 'both'): void {
    this.direction.set(dir);
    if (this.rootEntity()) {
      this.traverse(this.rootEntity()!._id, this.depth(), dir);
    }
  }

  onHideLabelsChange(hide: boolean): void {
    this.hideLabels.set(hide);
    if (this.cy) {
      if (hide) {
        this.cy.edges().addClass('hide-labels');
      } else {
        this.cy.edges().removeClass('hide-labels');
      }
    }
  }

  selectRoot(entity: Entity, pushHistory = false): void {
    this.rootEntity.set(entity);
    this.searchQuery.set(entity.name);
    this.selectedNode.set(null);
    this.selectedEntityRecord.set(null);
    this.selectedEdge.set(null);
    this.selectedEdgeRecord.set(null);
    this.nodeMemories.set([]);
    this.nodeChrono.set([]);
    if (!this.isEmbedded()) this.updateUrl(entity._id, pushHistory);
    this.traverse(entity._id, this.depth(), this.direction());
  }

  fitGraph(): void {
    if (this.cy) this.cy.fit(undefined, 40);
  }

  resetGraph(): void {
    this.rootEntity.set(null);
    this.selectedNode.set(null);
    this.selectedEntityRecord.set(null);
    this.selectedEdge.set(null);
    this.selectedEdgeRecord.set(null);
    this.nodeMemories.set([]);
    this.nodeChrono.set([]);
    this.searchQuery.set('');
    this.truncated.set(false);
    this.graphNodes = [];
    this.graphEdges = [];
    this.cacheStartId = null;
    this.cacheDirection = null;
    this.cacheMaxDepth = 0;
    this.cacheNodes = [];
    this.cacheEdges = [];
    this.cacheTruncated = false;
    if (this.cy) {
      this.cy.elements().remove();
    }
  }

  // ── Graph traversal ─────────────────────────────────────────────────────────

  private traverse(startId: string, maxDepth: number, direction: 'outbound' | 'inbound' | 'both'): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;

    this.selectedNode.set(null);
    this.selectedEntityRecord.set(null);
    this.selectedEdge.set(null);
    this.selectedEdgeRecord.set(null);

    const sameRoot = this.cacheStartId === startId && this.cacheDirection === direction;

    // Depth decrease (or same depth): serve from cache — no network request needed
    if (sameRoot && maxDepth <= this.cacheMaxDepth) {
      this.applyDepthFilter(startId, maxDepth);
      return;
    }

    // Depth increase into an un-truncated cache: fetch only the new frontier and merge
    const incremental = sameRoot && maxDepth > this.cacheMaxDepth && !this.cacheTruncated;

    this.loading.set(true);
    this.api.traverseGraph(spaceId, { startId, direction, maxDepth, limit: 200 }).pipe(
      catchError(() => of({ nodes: [], edges: [], truncated: false } as TraverseResult)),
    ).subscribe(result => {
      this.loading.set(false);

      if (incremental) {
        // Merge only the new nodes/edges into the existing cache
        const knownNodes = new Set(this.cacheNodes.map(n => n._id));
        const knownEdges = new Set(this.cacheEdges.map(e => e._id));
        for (const n of result.nodes) if (!knownNodes.has(n._id)) this.cacheNodes.push(n);
        for (const e of result.edges) if (!knownEdges.has(e._id)) this.cacheEdges.push(e);
      } else {
        this.cacheNodes = result.nodes;
        this.cacheEdges = result.edges;
      }

      this.cacheStartId = startId;
      this.cacheDirection = direction;
      this.cacheMaxDepth = maxDepth;
      this.cacheTruncated = result.truncated;

      this.truncated.set(result.truncated);
      this.applyDepthFilter(startId, maxDepth);
    });
  }

  // Filter the full cache down to the requested depth and re-render
  private applyDepthFilter(startId: string, maxDepth: number): void {
    this.graphNodes = this.cacheNodes.filter(n => n.depth <= maxDepth);
    const visibleIds = new Set<string>(this.graphNodes.map(n => n._id));
    visibleIds.add(startId);  // root node always included
    this.graphEdges = this.cacheEdges.filter(e => visibleIds.has(e.from) && visibleIds.has(e.to));
    this.renderGraph(startId);
  }

  private renderGraph(rootId: string): void {
    if (!this.cy) return;

    this.cy.resize();  // ensure canvas matches current container dimensions
    this.cy.elements().remove();

    const elements: any[] = [];

    // Add the root node (not included in traverse result)
    const root = this.rootEntity();
    if (root) {
      elements.push({
        group: 'nodes',
        data: { id: root._id, label: root.name, type: root.type || 'default', depth: 0 },
        classes: 'root',
      });
    }

    for (const n of this.graphNodes) {
      // Skip if root was already added
      if (n._id === rootId) continue;
      elements.push({
        group: 'nodes',
        data: { id: n._id, label: n.name, type: n.type || 'default', depth: n.depth },
      });
    }

    for (const e of this.graphEdges) {
      elements.push({
        group: 'edges',
        data: { id: e._id, source: e.from, target: e.to, label: e.label },
      });
    }

    this.cy.add(elements);
    this.nodeCount.set(elements.filter((e: any) => e.group === 'nodes').length);
    this.edgeCount.set(elements.filter((e: any) => e.group === 'edges').length);

    // Apply hide-labels class to edges
    if (this.hideLabels()) {
      this.cy.edges().addClass('hide-labels');
    } else {
      this.cy.edges().removeClass('hide-labels');
    }

    // Run layout
    const layout = this.cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 400,
      nodeRepulsion: () => 8000,
      idealEdgeLength: () => 120,
      gravity: 0.3,
      padding: 40,
    } as any);

    layout.on('layoutstop', () => this.fitGraph());
    layout.run();
  }

  // ── Detail panel helpers ────────────────────────────────────────────────────

  private loadNodeDetails(entityId: string): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;

    // Fetch full entity record for the record card
    this.api.getEntity(spaceId, entityId).pipe(
      catchError(() => of(null)),
    ).subscribe(ent => { if (ent) this.selectedEntityRecord.set(ent); });

    forkJoin({
      mems: this.api.listMemories(spaceId, 100, 0, { entity: entityId }).pipe(
        catchError(() => of({ memories: [] as Memory[] })),
      ),
      chrono: this.api.queryBrain(spaceId, {
        collection: 'chrono',
        filter: { entityIds: entityId },
        limit: 100,
      }).pipe(
        catchError(() => of({ results: [] as Record<string, unknown>[], collection: 'chrono' as const, count: 0 })),
      ),
    }).subscribe(({ mems, chrono }) => {
      this.nodeMemories.set(mems.memories);
      this.nodeChrono.set(chrono.results as unknown as ChronoEntry[]);
    });
  }

  toggleSort(field: 'description' | 'createdAt'): void {
    if (this.sortField() === field) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
  }

  sortArrow(field: 'description' | 'createdAt'): string {
    return this.sortField() === field ? (this.sortAsc() ? '▲' : '▼') : '';
  }

  openEntityPopup(node: TraverseNode): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    this.api.getEntity(spaceId, node._id).pipe(
      catchError(() => of(null)),
    ).subscribe(ent => {
      if (ent) {
        this.popupRecord.set(ent as unknown as Record<string, unknown>);
        this.popupType.set('entity');
      }
    });
  }

  private loadEdgeDetails(te: TraverseEdge): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    this.nodeMemories.set([]);
    this.nodeChrono.set([]);

    // Load the full edge record
    this.api.getEdge(spaceId, te._id).pipe(
      catchError(() => of(null)),
    ).subscribe(edge => {
      if (edge) this.selectedEdgeRecord.set(edge);
    });

    // Load memories/chronos linked to BOTH endpoints
    forkJoin({
      mems: this.api.listMemories(spaceId, 100, 0, { entity: te.from }).pipe(
        catchError(() => of({ memories: [] as Memory[] })),
      ),
      chrono: this.api.queryBrain(spaceId, {
        collection: 'chrono',
        filter: { entityIds: te.from },
        limit: 100,
      }).pipe(
        catchError(() => of({ results: [] as Record<string, unknown>[], collection: 'chrono' as const, count: 0 })),
      ),
    }).subscribe(({ mems, chrono }) => {
      // filter to those also referencing te.to
      const filteredMems = mems.memories.filter(m =>
        Array.isArray((m as any).entityIds) && (m as any).entityIds.includes(te.to)
      );
      const filteredChrono = (chrono.results as unknown as ChronoEntry[]).filter(c =>
        Array.isArray(c.entityIds) && c.entityIds.includes(te.from) && c.entityIds.includes(te.to)
      );
      this.nodeMemories.set(filteredMems);
      this.nodeChrono.set(filteredChrono);
    });
  }

  openDetailPopup(row: DetailRow): void {
    this.popupRecord.set(row.raw);
    this.popupType.set(row.kind);
  }

  asRecord(obj: unknown): Record<string, unknown> {
    return obj as Record<string, unknown>;
  }

  objectKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj);
  }

  closePopup(): void {
    this.popupRecord.set(null);
  }

  // ── URL management ──────────────────────────────────────────────────────────
    const spaceId = this.activeSpaceId();
    const path = this.location.path().split('?')[0];
    const qs = `space=${spaceId}&entity=${entityId}`;
    if (push) {
      this.location.go(path, qs);
    } else {
      this.location.replaceState(path, qs);
    }
  }
}
