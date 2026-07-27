import {
  ChangeDetectionStrategy,
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
import { PhIconComponent } from '../../shared/ph-icon.component';
import { ErrorStateComponent } from '../../shared/error-state.component';
import { ModalDirective } from '../../shared/modal.directive';
import { httpErrorReason } from '../../core/http-error';
import {
  Space,
  Entity,
  Memory,
  ChronoEntry,
  ChronoType,
  ChronoStatus,
  Edge,
  TraverseNode,
  TraverseEdge,
  TraverseResult,
} from '../../core/api.types';
import { SpacesApi } from '../../core/spaces-api.service';
import { BrainApi } from '../../core/brain-api.service';
import { AuthApi } from '../../core/auth-api.service';
import { EntryPopupComponent } from '../../shared/entry-popup.component';
import { EntitySearchComponent } from '../../shared/entity-search.component';
import { PropertiesViewComponent } from '../../shared/properties-view.component';
import { TagInputComponent } from '../../shared/tag-input.component';
import { PropertiesEditorComponent } from '../../shared/properties-editor.component';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  DetailRow, DetailRef, buildDetailRows, filterAndSortDetails, nextSort,
} from './graph-details';
import {
  TraversalCache, emptyCache, decideFetch, applyResult, filterToDepth,
} from './graph-traversal-cache';
import {
  GraphTheme, DEFAULT_GRAPH_THEME, readGraphTheme, typeColor,
  buildElements, createGraphCytoscape, renderElements,
} from './graph-cytoscape';
import { GRAPH_STYLES } from './graph.styles';

@Component({
  selector: 'app-graph-view',
  standalone: true,
  // OnPush (P5, final slice): the highest-value target — a cytoscape canvas whose 9 event handlers
  // fire OUTSIDE Angular. Audited safe: the four handlers that touch Angular state
  // (node/edge/background tap, dbltap re-root) write only signals (`selectedNode`/`selectedEdge`/…),
  // and signal writes notify OnPush regardless of zone; the other five only toggle cytoscape CSS
  // classes on the canvas, never Angular state. Nothing mutates a signal's value in place, and the
  // plain `graphNodes`/`graphEdges`/color fields are canvas-only (never in the template). The one
  // pair of template-bound plain fields — `drawerEditMemory`/`drawerEditChrono` — is written in
  // `openBrainDrawer` alongside the `drawerRecord` signal that guards the drawer's `@if`, the same
  // load-bearing coupling pinned by the brain spec.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, EntryPopupComponent, EntitySearchComponent, PropertiesViewComponent, TagInputComponent, PropertiesEditorComponent, PhIconComponent, ErrorStateComponent, TranslocoPipe, ModalDirective],
  host: { '[class.embedded]': 'isEmbedded()' },
  styles: [GRAPH_STYLES],
  template: `
    <!-- â•â•â• Space selector â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
    @if (!isEmbedded() && spaces().length > 0) {
      <div class="space-tabs">
        @for (s of spaces(); track s.id) {
          <button class="space-chip" [class.active]="activeSpaceId() === s.id" (click)="onSpaceChange(s.id)">{{ s.label }}</button>
        }
      </div>
    }

    <!-- â•â•â• Toolbar â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
    <div class="graph-toolbar">
      <div class="search-wrapper">
        <app-entity-search
          mode="bar"
          [spaceId]="activeSpaceId()"
          placeholder="entitySearch.defaultPlaceholder"
          defaultMode="semantic"
          (selected)="selectRoot($event)"
          (queryChange)="onSearchQueryChange($event)"
        />
      </div>

      <div class="toolbar-divider"></div>

      <div class="depth-control">
        <span class="toolbar-label">{{ 'graph.toolbar.depth' | transloco }}</span>
        <input type="range" min="1" max="10" [ngModel]="depth()" (ngModelChange)="onDepthChange($event)" />
        <span class="depth-value">{{ depth() }}</span>
      </div>

      <div class="pill-group">
        <button [class.active]="direction() === 'outbound'" (click)="setDirection('outbound')">{{ 'graph.toolbar.direction.out' | transloco }}</button>
        <button [class.active]="direction() === 'inbound'" (click)="setDirection('inbound')">{{ 'graph.toolbar.direction.in' | transloco }}</button>
        <button [class.active]="direction() === 'both'"    (click)="setDirection('both')">{{ 'graph.toolbar.direction.both' | transloco }}</button>
      </div>

      <div class="pill-group">
        <button [class.active]="!hideLabels()" (click)="onHideLabelsChange(!hideLabels())" [attr.title]="'graph.toolbar.toggleLabels' | transloco">{{ 'graph.toolbar.labels' | transloco }}</button>
      </div>

      <div class="toolbar-spacer"></div>

      @if (rootEntity()) {
        <span class="graph-stats">{{ 'graph.stats.nodesEdges' | transloco: { nodes: nodeCount(), edges: edgeCount() } }}</span>
      }
      <button class="toolbar-btn" [attr.title]="'graph.toolbar.fitViewport' | transloco" (click)="fitGraph()"><ph-icon name="corners-out" [size]="16"/></button>
      <button class="toolbar-btn" [attr.title]="'graph.toolbar.resetGraph' | transloco"     (click)="resetGraph()"><ph-icon name="arrows-clockwise" [size]="16"/></button>
    </div>

    <!-- â•â•â• Canvas row (canvas + optional side panel) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
    <div class="canvas-row">

      <!-- â”€â”€ Canvas zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      <div class="canvas-zone">
        @if (truncated()) {
          <div class="truncation-banner">
            {{ 'graph.truncated' | transloco }}
            <button (click)="truncated.set(false)"><ph-icon name="x" [size]="14"/></button>
          </div>
        }

        @if (loading()) {
          <div class="loading-overlay"><div class="loading-spinner"></div></div>
        }

        @if (loadError() !== null && !loading()) {
          <div class="canvas-empty">
            <app-error-state [message]="'graph.error.load' | transloco" [reason]="loadError() ?? ''" (retry)="retryTraverse()" />
          </div>
        } @else if (!rootEntity() && !loading()) {
          <div class="canvas-empty">
            <div class="empty-icon"><ph-icon name="circle-dashed" [size]="52"/></div>
            <h3>{{ 'graph.empty.title' | transloco }}</h3>
            <p>{{ 'graph.empty.subtitle' | transloco }}</p>
          </div>
        }

        <div #cyContainer class="cy-container" [style.visibility]="rootEntity() ? 'visible' : 'hidden'"></div>
      </div>

      <!-- â”€â”€ Side panel (node selected) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      @if (selectedNode()) {
        <div class="side-panel">
          <div class="side-panel-header">
            <div class="side-panel-title">
              <span class="side-dot" [style.background]="panelColor()"></span>
              <h3>{{ selectedNode()!.name }}</h3>
              <span class="badge">{{ selectedNode()!.type || 'entity' }}</span>
            </div>
            <div class="side-panel-header-actions">
              <button class="btn btn-sm btn-ghost" style="display:inline-flex;align-items:center" (click)="openEntityPopup(selectedNode()!)"><ph-icon name="eye" [size]="14"/></button>
              <button class="icon-btn" [attr.title]="'common.close' | transloco" (click)="selectedNode.set(null)"><ph-icon name="x" [size]="16"/></button>
            </div>
          </div>
          <div class="side-panel-body">

            <!-- Record card -->
            <div class="record-card">
              @if (selectedEntityRecord()) {
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'brain.entities.table.name' | transloco }}</div>
                  <div class="drawer-value">{{ selectedEntityRecord()!.name }}</div>
                </div>
                @if (selectedEntityRecord()!.type) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
                    <div class="drawer-value">{{ selectedEntityRecord()!.type }}</div>
                  </div>
                }
                @if (selectedEntityRecord()!.description) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
                    <div class="drawer-value">{{ selectedEntityRecord()!.description }}</div>
                  </div>
                }
                @if (selectedEntityRecord()!.tags?.length) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
                    <div>
                      @for (t of selectedEntityRecord()!.tags!; track t) {
                        <span class="drawer-tag">{{ t }}</span>
                      }
                    </div>
                  </div>
                }
                @if (selectedEntityRecord()!.properties && objectKeys(selectedEntityRecord()!.properties!).length) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
                    <app-properties-view [properties]="selectedEntityRecord()!.properties!" />
                  </div>
                }
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ selectedEntityRecord()!._id }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ selectedEntityRecord()!.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
                </div>
              } @else {
                <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">{{ 'common.loading' | transloco }}</div>
              }
            </div>

            <!-- Lists pane: memories + chrono -->
            <div class="lists-pane">
              <div class="list-section">
                <div class="list-section-header">
                  {{ 'graph.panel.memories' | transloco }} <span class="count-chip">{{ nodeMemories().length }}</span>
                </div>
                <div class="list-body">
                  @for (m of nodeMemories(); track m._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: m._id, kind: 'memory' })">
                      <span class="list-row-text" [title]="m.fact || m.description">{{ m.fact || m.description || 'â€”' }}</span>
                      <span class="list-row-date">{{ m.createdAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">{{ 'graph.panel.noMemories' | transloco }}</div>
                  }
                </div>
              </div>
              <div class="list-section">
                <div class="list-section-header">
                  {{ 'graph.panel.chrono' | transloco }} <span class="count-chip">{{ nodeChrono().length }}</span>
                </div>
                <div class="list-body">
                  @for (c of nodeChrono(); track c._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: c._id, kind: 'chrono' })">
                      <span class="list-row-text" [title]="c.title || c.description">{{ c.title || c.description || 'â€”' }}</span>
                      <span class="list-row-date">{{ c.startsAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">{{ 'graph.panel.noChronoEntries' | transloco }}</div>
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      }

      <!-- â”€â”€ Side panel (edge selected) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
      @if (selectedEdge()) {
        <div class="side-panel">
          <div class="side-panel-header">
            <div class="side-panel-title">
              <span class="side-dot" [style.background]="panelColor()"></span>
              <h3>{{ selectedEdge()!.label || 'edge' }}</h3>
              <span class="badge">{{ 'graph.drawer.badge.edge' | transloco }}</span>
            </div>
            <div class="side-panel-header-actions">
              @if (selectedEdgeRecord()) {
                <button class="btn btn-sm btn-ghost" style="display:inline-flex;align-items:center" (click)="popupRecord.set(asRecord(selectedEdgeRecord()!)); popupType.set('edge')"><ph-icon name="eye" [size]="14"/></button>
              }
              <button class="icon-btn" [attr.title]="'common.close' | transloco" (click)="selectedEdge.set(null); selectedEdgeRecord.set(null)"><ph-icon name="x" [size]="16"/></button>
            </div>
          </div>
          <div class="side-panel-body">

            <!-- Edge record card -->
            <div class="record-card">
              @if (selectedEdgeRecord()) {
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'brain.edges.table.relation' | transloco }}</div>
                  <div class="drawer-value">{{ selectedEdgeRecord()!.label }}</div>
                </div>
                @if (selectedEdgeRecord()!.type) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.type' | transloco }}</div>
                    <div class="drawer-value">{{ selectedEdgeRecord()!.type }}</div>
                  </div>
                }
                @if (selectedEdgeRecord()!.description) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.description' | transloco }}</div>
                    <div class="drawer-value">{{ selectedEdgeRecord()!.description }}</div>
                  </div>
                }
                @if (selectedEdgeRecord()!.weight !== undefined && selectedEdgeRecord()!.weight !== null) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.weight' | transloco }}</div>
                    <div class="drawer-value">{{ selectedEdgeRecord()!.weight }}</div>
                  </div>
                }
                @if (selectedEdgeRecord()!.tags?.length) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.tags' | transloco }}</div>
                    <div>
                      @for (t of selectedEdgeRecord()!.tags!; track t) {
                        <span class="drawer-tag">{{ t }}</span>
                      }
                    </div>
                  </div>
                }
                @if (selectedEdgeRecord()!.properties && objectKeys(selectedEdgeRecord()!.properties!).length) {
                  <div class="drawer-field">
                    <div class="drawer-label">{{ 'common.form.properties' | transloco }}</div>
                    <app-properties-view [properties]="selectedEdgeRecord()!.properties!" />
                  </div>
                }
                <hr class="drawer-hr">
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.from' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ selectedEdgeRecord()!.fromName || selectedEdge()!.from }}</div>
                </div>
                <div class="drawer-field">
                  <div class="drawer-label">{{ 'common.form.to' | transloco }}</div>
                  <div class="drawer-readonly-value">{{ selectedEdgeRecord()!.toName || selectedEdge()!.to }}</div>
                </div>
                <div class="drawer-field" style="margin-bottom:0;">
                  <div class="drawer-label">_id</div>
                  <div class="drawer-readonly-value" style="font-family:var(--font-mono,monospace);font-size:10px;">{{ selectedEdgeRecord()!._id }}</div>
                </div>
              } @else {
                <div style="font-size:12px;color:var(--text-muted);padding:8px 0;">{{ 'common.loading' | transloco }}</div>
              }
            </div>

            <!-- Lists pane: memories + chrono for both endpoints -->
            <div class="lists-pane">
              <div class="list-section">
                <div class="list-section-header">
                  {{ 'graph.panel.memories' | transloco }} <span class="count-chip">{{ nodeMemories().length }}</span>
                </div>
                <div class="list-body">
                  @for (m of nodeMemories(); track m._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: m._id, kind: 'memory' })">
                      <span class="list-row-text" [title]="m.fact || m.description">{{ m.fact || m.description || 'â€”' }}</span>
                      <span class="list-row-date">{{ m.createdAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">{{ 'graph.panel.noLinkedMemories' | transloco }}</div>
                  }
                </div>
              </div>
              <div class="list-section">
                <div class="list-section-header">
                  {{ 'graph.panel.chrono' | transloco }} <span class="count-chip">{{ nodeChrono().length }}</span>
                </div>
                <div class="list-body">
                  @for (c of nodeChrono(); track c._id) {
                    <div class="list-row" (click)="openDetailPopup({ id: c._id, kind: 'chrono' })">
                      <span class="list-row-text" [title]="c.title || c.description">{{ c.title || c.description || 'â€”' }}</span>
                      <span class="list-row-date">{{ c.startsAt | date:'dd.MM.yy' }}</span>
                    </div>
                  } @empty {
                    <div class="list-empty">{{ 'graph.panel.noLinkedChrono' | transloco }}</div>
                  }
                </div>
              </div>
            </div>

          </div>
        </div>
      }

    </div><!-- /canvas-row -->

    <!-- â•â•â• Entry popup (entity / edge) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
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

    <!-- â•â•â• Brain-style drawer modal (memory / chrono) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• -->
    @if (drawerRecord(); as dr) {
      <div class="bdrawer-overlay">
        <div class="bdrawer-modal" [appModal]="'brain.drawer.recordDetailsAriaLabel' | transloco" (dismiss)="closeBrainDrawer()" (click)="$event.stopPropagation()">
          <div class="bdrawer-header">
            <div style="flex:1; min-width:0;">
              @if (dr.kind === 'memory') { <span class="badge badge-blue" style="margin-bottom:6px; display:inline-block;">{{ 'graph.drawer.badge.memory' | transloco }}</span> }
              @if (dr.kind === 'chrono') { <span class="badge" style="margin-bottom:6px; display:inline-block;">{{ 'graph.drawer.badge.chrono' | transloco }}</span> }
              <div class="bdrawer-title">
                @if (dr.kind === 'memory') { {{ drawerEditMemory.fact.length > 80 ? (drawerEditMemory.fact | slice:0:80) + 'â€¦' : drawerEditMemory.fact }} }
                @if (dr.kind === 'chrono') { {{ drawerEditChrono.title || dr.record.title }} }
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0; align-items:flex-start; padding-top:2px;">
              <button class="btn btn-sm btn-primary" [disabled]="drawerSaving()" (click)="saveBrainDrawer()">
                @if (drawerSaving()) { <span class="spinner" style="width:11px;height:11px;border-width:2px;"></span> } {{ 'common.save' | transloco }}
              </button>
              <button class="icon-btn" [attr.title]="'common.close' | transloco" (click)="closeBrainDrawer()"><ph-icon name="x" [size]="16"/></button>
            </div>
          </div>

          <div class="bdrawer-body">
            @if (drawerError()) {
              <div class="alert alert-error" style="margin-bottom:16px; font-size:13px;">{{ drawerError() }}</div>
            }
            <form>

              <!-- â”€â”€ MEMORY â”€â”€ -->
              @if (dr.kind === 'memory') {
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.fact' | transloco }} <span style="color:var(--error)">*</span></div>
                  <textarea [(ngModel)]="drawerEditMemory.fact" name="drwMemFact" rows="4"></textarea>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.description' | transloco }}</div>
                  <textarea [(ngModel)]="drawerEditMemory.description" name="drwMemDesc" rows="3" style="resize:vertical;"></textarea>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.tags' | transloco }}</div>
                  <app-tag-input [(value)]="drawerEditMemory.tags" [suggestions]="[]" inputName="drwMemTags" />
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.entityIds' | transloco }}</div>
                  <div class="flyout-wrap">
                    <div class="entity-multi">
                      @for (chip of entityChips(drawerEditMemory.entityIds); track chip.id) {
                        <span class="chip" [title]="chip.id">
                          <span class="chip-name">{{ chip.name }}</span>
                          <button type="button" class="chip-remove" (mousedown)="removeEntityId(drawerEditMemory, chip.id)"><ph-icon name="x" [size]="12"/></button>
                        </span>
                      }
                      <button type="button" class="chip-add" (click)="openFlyout('drawer-memory-entityIds')">{{ 'common.addMore' | transloco }}</button>
                    </div>
                    @if (flyoutField() === 'drawer-memory-entityIds') {
                      <div class="flyout-panel">
                        <app-entity-search mode="picker" [spaceId]="activeSpaceId()" placeholder="common.searchEntitiesPlaceholder"
                          (selected)="pickDrawerEntity($event, 'drawer-memory-entityIds')" />
                        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                          <button type="button" class="btn btn-sm btn-secondary" (click)="closeFlyout()">{{ 'common.done' | transloco }}</button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.properties' | transloco }}</div>
                  <app-properties-editor [(value)]="drawerEditMemory.properties" />
                </div>
                <hr class="bdrawer-hr">
                <div class="bdrawer-field">
                  <div class="bdrawer-label">_id</div>
                  <div class="bdrawer-readonly">{{ dr.record._id }}</div>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.seq' | transloco }}</div>
                  <div class="bdrawer-readonly">{{ dr.record.seq }}</div>
                </div>
                <div class="bdrawer-field" style="margin-bottom:0;">
                  <div class="bdrawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="bdrawer-readonly">{{ dr.record.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              }

              <!-- â”€â”€ CHRONO â”€â”€ -->
              @if (dr.kind === 'chrono') {
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.title' | transloco }} <span style="color:var(--error)">*</span></div>
                  <input type="text" [(ngModel)]="drawerEditChrono.title" name="drwChronoTitle" />
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.kind' | transloco }} <span style="color:var(--error)">*</span></div>
                  @if (drawerEditChrono.kind !== '__custom__') {
                    <select [(ngModel)]="drawerEditChrono.kind" name="drwChronoKind">
                      @for (k of chronoKinds; track k) { <option [value]="k">{{ k }}</option> }
                      <option value="__custom__">{{ 'brain.chrono.form.customKind' | transloco }}</option>
                    </select>
                  } @else {
                    <div style="display:flex; gap:4px;">
                      <input type="text" [(ngModel)]="drawerEditChrono.customKind" name="drwChronoCustomKind" style="flex:1;" />
                      <button type="button" class="btn btn-sm btn-secondary" style="padding:4px 8px;" (click)="drawerEditChrono.kind = 'event'; drawerEditChrono.customKind = ''"><ph-icon name="x" [size]="14"/></button>
                    </div>
                  }
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'brain.chrono.table.status' | transloco }}</div>
                  <select [(ngModel)]="drawerEditChrono.status" name="drwChronoStatus">
                    @for (s of chronoStatusOptions; track s) { <option [value]="s">{{ s }}</option> }
                  </select>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.startsAt' | transloco }} <span style="color:var(--error)">*</span></div>
                  <input type="datetime-local" [(ngModel)]="drawerEditChrono.startsAt" name="drwChronoStarts" />
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.endsAt' | transloco }}</div>
                  <input type="datetime-local" [(ngModel)]="drawerEditChrono.endsAt" name="drwChronoEnds" />
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.description' | transloco }}</div>
                  <textarea [(ngModel)]="drawerEditChrono.description" name="drwChronoDesc" rows="3"></textarea>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.form.tags' | transloco }}</div>
                  <app-tag-input [(value)]="drawerEditChrono.tags" [suggestions]="[]" inputName="drwChronoTags" />
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.entityIds' | transloco }}</div>
                  <div class="flyout-wrap">
                    <div class="entity-multi">
                      @for (chip of entityChips(drawerEditChrono.entityIds); track chip.id) {
                        <span class="chip" [title]="chip.id">
                          <span class="chip-name">{{ chip.name }}</span>
                          <button type="button" class="chip-remove" (mousedown)="removeEntityId(drawerEditChrono, chip.id)"><ph-icon name="x" [size]="12"/></button>
                        </span>
                      }
                      <button type="button" class="chip-add" (click)="openFlyout('drawer-chrono-entityIds')">{{ 'common.addMore' | transloco }}</button>
                    </div>
                    @if (flyoutField() === 'drawer-chrono-entityIds') {
                      <div class="flyout-panel">
                        <app-entity-search mode="picker" [spaceId]="activeSpaceId()" placeholder="common.searchEntitiesPlaceholder"
                          (selected)="pickDrawerEntity($event, 'drawer-chrono-entityIds')" />
                        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                          <button type="button" class="btn btn-sm btn-secondary" (click)="closeFlyout()">{{ 'common.done' | transloco }}</button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.memoryIds' | transloco }} <span class="bdrawer-muted">{{ 'common.commaSeparatedIds' | transloco }}</span></div>
                  <textarea [(ngModel)]="drawerEditChrono.memoryIds" name="drwChronoMemIds" rows="2" style="font-family:var(--font-mono,monospace); font-size:11px;"></textarea>
                </div>
                <hr class="bdrawer-hr">
                <div class="bdrawer-field">
                  <div class="bdrawer-label">_id</div>
                  <div class="bdrawer-readonly">{{ dr.record._id }}</div>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.seq' | transloco }}</div>
                  <div class="bdrawer-readonly">{{ dr.record.seq }}</div>
                </div>
                <div class="bdrawer-field">
                  <div class="bdrawer-label">{{ 'common.createdAt' | transloco }}</div>
                  <div class="bdrawer-readonly">{{ dr.record.createdAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
                <div class="bdrawer-field" style="margin-bottom:0;">
                  <div class="bdrawer-label">{{ 'common.updatedAt' | transloco }}</div>
                  <div class="bdrawer-readonly">{{ dr.record.updatedAt | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </div>
              }
            </form>
          </div>
        </div>
      </div>
    }
  `,
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy {
  // â”€â”€ DI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private spacesApi = inject(SpacesApi);
  private brainApi = inject(BrainApi);
  private authApi = inject(AuthApi);
  private location = inject(Location);
  private route = inject(ActivatedRoute);

  // â”€â”€ Element refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  cyContainer = viewChild<ElementRef<HTMLDivElement>>('cyContainer');

  // â”€â”€ Embedded input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Input() set embeddedSpaceId(v: string | undefined) {
    if (v !== undefined) {
      this.isEmbedded.set(true);
      const changed = this.activeSpaceId() !== v;
      this.activeSpaceId.set(v);
      if (changed && this.cy) this.resetGraph();
    }
  }

  // â”€â”€ State signals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  isEmbedded = signal(false);

  spaces = signal<Space[]>([]);
  activeSpaceId = signal('');
  searchQuery = signal('');

  rootEntity = signal<Entity | null>(null);
  depth = signal(2);
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

  // â”€â”€ Brain-style drawer for memory / chrono â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  drawerRecord = signal<{ kind: 'memory' | 'chrono'; record: any } | null>(null);
  drawerSaving = signal(false);
  drawerError = signal('');
  drawerEditMemory = { fact: '', tags: [] as string[], entityIds: '', description: '', properties: {} as Record<string, string | number | boolean> };
  drawerEditChrono = { title: '', kind: 'event' as string, customKind: '', status: 'upcoming' as string, startsAt: '', endsAt: '', description: '', tags: [] as string[], entityIds: '', memoryIds: '' };
  entityNameCache = signal<Record<string, string>>({});
  flyoutField = signal('');
  readonly chronoKinds: ChronoType[] = ['event', 'deadline', 'plan', 'prediction', 'milestone'];
  readonly chronoStatusOptions: ChronoStatus[] = ['upcoming', 'active', 'completed', 'overdue', 'cancelled'];

  loading = signal(false);
  /** Failure reason for the last traversal; null when it succeeded (U3). A
   *  failed traversal must not render as an empty graph (which reads as "no
   *  connections"). */
  loadError = signal<string | null>(null);
  private lastTraverse: { startId: string; maxDepth: number; direction: 'outbound' | 'inbound' | 'both' } | null = null;

  // â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  allDetails = computed<DetailRow[]>(() => buildDetailRows(this.nodeMemories(), this.nodeChrono()));

  filteredDetails = computed<DetailRow[]>(() => filterAndSortDetails(this.allDetails(), {
    type: this.detailTypeFilter(),
    text: this.detailDescFilter(),
    field: this.sortField(),
    asc: this.sortAsc(),
  }));

  nodeColor = computed(() => {
    const n = this.selectedNode();
    return n ? this.typeColor(n.type || 'default') : this.theme.fallback;
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
    if (n) return this.typeColor(n.type || 'default');
    const e = this.selectedEdgeRecord();
    if (e) return this.typeColor(e.label || 'edge');
    return this.theme.fallback;
  });

  // â”€â”€ Private state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private cy: any = null;
  private subs = new Subscription();

  /** Palette read from CSS vars once the view exists; the default until then. */
  private theme: GraphTheme = DEFAULT_GRAPH_THEME;

  private typeColor(type: string): string {
    return typeColor(this.theme, type);
  }

  // Currently rendered (depth-filtered) view
  private graphNodes: TraverseNode[] = [];
  private graphEdges: TraverseEdge[] = [];

  /** Full-depth traversal cache — what makes a shallower depth free. See `graph-traversal-cache.ts`. */
  private cache: TraversalCache = emptyCache();

  // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  ngOnInit(): void {
    // Load spaces only in standalone mode; in embedded mode the space is injected via @Input
    if (!this.isEmbedded()) {
      this.spacesApi.listSpaces().subscribe(res => {
        this.spaces.set(res.spaces);
        const qp = this.route.snapshot.queryParams;
        const initial = qp['space'] || (res.spaces.length ? res.spaces[0].id : '');
        this.activeSpaceId.set(initial);

        // If entity query-param present, load it as root
        if (qp['entity'] && initial) {
          this.brainApi.getEntity(initial, qp['entity']).pipe(
            catchError(() => of(null)),
          ).subscribe(ent => {
            if (ent) this.selectRoot(ent);
          });
        }
      });
    }

    this.authApi.getMe().pipe(catchError(() => of(null))).subscribe(me => {
      this.canEdit.set(me ? !me.readOnly : false);
    });
  }

  ngAfterViewInit(): void {
    this.theme = readGraphTheme();   // CSS vars resolve only once the view exists
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

  // â”€â”€ Cytoscape init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private initCytoscape(): void {
    const container = this.cyContainer()?.nativeElement;
    if (!container) return;
    this.cy = createGraphCytoscape(container, this.theme, {
      onNodeTap: (id) => this.onNodeTap(id),
      onEdgeTap: (id) => this.onEdgeTap(id),
      onNodeDoubleTap: (id) => this.onNodeDoubleTap(id),
      onBackgroundTap: () => this.onBackgroundTap(),
    });
  }

  // â”€â”€ Canvas interactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //
  // These run OUTSIDE the Angular zone (cytoscape's own event system). Safe under OnPush only because
  // each writes a SIGNAL — a plain field would update nothing on screen.

  private onNodeTap(id: string): void {
    // graphNodes does NOT include the root (it is added to the canvas separately), so a tap on the
    // root — the most-clicked node in any graph — has to be reconstructed from rootEntity.
    let tn = this.graphNodes.find(n => n._id === id);
    if (!tn) {
      const root = this.rootEntity();
      if (root && root._id === id) {
        tn = { _id: root._id, name: root.name, type: root.type || 'default', depth: 0, description: root.description, tags: root.tags };
      }
    }
    if (!tn) return;
    this.selectedEdge.set(null);
    this.selectedEdgeRecord.set(null);
    this.selectedEntityRecord.set(null);
    this.selectedNode.set(tn);
    this.loadNodeDetails(id);
  }

  private onEdgeTap(id: string): void {
    const te = this.graphEdges.find(e => e._id === id);
    if (!te) return;
    this.selectedNode.set(null);
    this.selectedEdge.set(te);
    this.loadEdgeDetails(te);
  }

  private onNodeDoubleTap(id: string): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    this.brainApi.getEntity(spaceId, id).pipe(
      catchError(() => of(null)),
    ).subscribe(ent => { if (ent) this.selectRoot(ent, true); });
  }

  private onBackgroundTap(): void {
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.selectedEdgeRecord.set(null);
  }

  // â”€â”€ Toolbar handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    this.cache = emptyCache();
    if (this.cy) {
      this.cy.elements().remove();
    }
  }

  // â”€â”€ Graph traversal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private traverse(startId: string, maxDepth: number, direction: 'outbound' | 'inbound' | 'both'): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;

    this.selectedNode.set(null);
    this.selectedEntityRecord.set(null);
    this.selectedEdge.set(null);
    this.selectedEdgeRecord.set(null);

    const req = { startId, maxDepth, direction };
    const plan = decideFetch(this.cache, req);

    // A shallower view is always a subset of what was already fetched — no request needed.
    if (plan === 'from-cache') {
      this.applyDepthFilter(startId, maxDepth);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.lastTraverse = req;
    this.brainApi.traverseGraph(spaceId, { startId, direction, maxDepth, limit: 200 }).subscribe({
      error: (e) => { this.loading.set(false); this.loadError.set(httpErrorReason(e)); },
      next: (result) => {
        this.loading.set(false);
        this.cache = applyResult(this.cache, plan, req, result);
        this.truncated.set(result.truncated);
        this.applyDepthFilter(startId, maxDepth);
      },
    });
  }

  /** Re-run the last traversal — bound to the error state's Retry button. */
  retryTraverse(): void {
    if (this.lastTraverse) {
      const { startId, maxDepth, direction } = this.lastTraverse;
      this.traverse(startId, maxDepth, direction);
    }
  }

  // Filter the full cache down to the requested depth and re-render
  private applyDepthFilter(startId: string, maxDepth: number): void {
    const view = filterToDepth(this.cache, startId, maxDepth);
    this.graphNodes = view.nodes;
    this.graphEdges = view.edges;
    this.renderGraph(startId);
  }

  private renderGraph(rootId: string): void {
    if (!this.cy) return;

    const elements = buildElements(this.rootEntity(), this.graphNodes, this.graphEdges, rootId);

    // Count what was actually handed over, not what is cached — the badges must track the canvas, or
    // they keep reporting depth-5 nodes after the slider went back to 2.
    this.nodeCount.set(elements.filter(e => e.group === 'nodes').length);
    this.edgeCount.set(elements.filter(e => e.group === 'edges').length);

    renderElements(this.cy, elements, rootId, this.hideLabels(), () => this.onLayoutSettled());
  }

  /** Fit the finished layout, and open the root's panel if the user has not chosen something else. */
  private onLayoutSettled(): void {
    if (!this.cy) return;
    // Resize first: Angular may have opened or closed the side panel since renderGraph() ran, which
    // changes the canvas width without cytoscape knowing.
    this.cy.resize();
    this.cy.fit(undefined, 40);

    const root = this.rootEntity();
    if (!root || this.selectedNode() || this.selectedEdge()) return;

    this.selectedNode.set({ _id: root._id, name: root.name, type: root.type || 'default', depth: 0, description: root.description, tags: root.tags });
    this.loadNodeDetails(root._id);
    // Opening the panel narrows the canvas — refit once the DOM has caught up.
    setTimeout(() => {
      if (this.cy) {
        this.cy.resize();
        this.cy.fit(undefined, 40);
      }
    }, 50);
  }

  // â”€â”€ Detail panel helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private loadNodeDetails(entityId: string): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;

    // Fetch full entity record for the record card
    this.brainApi.getEntity(spaceId, entityId).pipe(
      catchError(() => of(null)),
    ).subscribe(ent => { if (ent) this.selectedEntityRecord.set(ent); });

    forkJoin({
      mems: this.brainApi.listMemories(spaceId, 100, 0, { entity: entityId }).pipe(
        catchError(() => of({ memories: [] as Memory[] })),
      ),
      chrono: this.brainApi.queryBrain(spaceId, {
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
    const next = nextSort({ field: this.sortField(), asc: this.sortAsc() }, field);
    this.sortField.set(next.field);
    this.sortAsc.set(next.asc);
  }

  sortArrow(field: 'description' | 'createdAt'): string {
    return this.sortField() === field ? (this.sortAsc() ? 'â–²' : 'â–¼') : '';
  }

  openEntityPopup(node: TraverseNode): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    this.brainApi.getEntity(spaceId, node._id).pipe(
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
    this.brainApi.getEdge(spaceId, te._id).pipe(
      catchError(() => of(null)),
    ).subscribe(edge => {
      if (edge) this.selectedEdgeRecord.set(edge);
    });

    // Load memories/chronos linked to BOTH endpoints
    forkJoin({
      mems: this.brainApi.listMemories(spaceId, 100, 0, { entity: te.from }).pipe(
        catchError(() => of({ memories: [] as Memory[] })),
      ),
      chrono: this.brainApi.queryBrain(spaceId, {
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

  // Takes only what it reads. The template used to build seven-field DetailRow literals at four call
  // sites for these two fields; the table's own rows still satisfy this shape.
  openDetailPopup(row: DetailRef): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId) return;
    if (row.kind === 'memory') {
      this.brainApi.getMemory(spaceId, row.id).pipe(catchError(() => of(null))).subscribe(m => {
        if (m) this.openBrainDrawer('memory', m);
      });
    } else {
      this.brainApi.getChrono(spaceId, row.id).pipe(catchError(() => of(null))).subscribe(c => {
        if (c) this.openBrainDrawer('chrono', c);
      });
    }
  }

  openBrainDrawer(kind: 'memory' | 'chrono', record: any): void {
    this.drawerError.set('');
    this.drawerSaving.set(false);
    this.flyoutField.set('');
    const ids: string[] = record.entityIds ?? [];
    if (ids.length) this.resolveEntityNamesById(ids);
    if (kind === 'memory') {
      this.drawerEditMemory = {
        fact: record.fact ?? '',
        tags: [...(record.tags ?? [])],
        entityIds: (record.entityIds ?? []).join(', '),
        description: record.description ?? '',
        properties: { ...(record.properties ?? {}) },
      };
    } else {
      const isPredefined = this.chronoKinds.includes(record.type as ChronoType);
      this.drawerEditChrono = {
        title: record.title ?? '',
        kind: isPredefined ? record.type : '__custom__',
        customKind: isPredefined ? '' : (record.type ?? ''),
        status: record.status ?? 'upcoming',
        startsAt: record.startsAt ? this.toLocalDatetime(record.startsAt) : '',
        endsAt: record.endsAt ? this.toLocalDatetime(record.endsAt) : '',
        description: record.description ?? '',
        tags: [...(record.tags ?? [])],
        entityIds: (record.entityIds ?? []).join(', '),
        memoryIds: (record.memoryIds ?? []).join(', '),
      };
    }
    this.drawerRecord.set({ kind, record });
  }

  closeBrainDrawer(): void {
    this.drawerRecord.set(null);
    this.drawerError.set('');
    this.flyoutField.set('');
  }

  saveBrainDrawer(): void {
    const dr = this.drawerRecord();
    if (!dr) return;
    const spaceId = this.activeSpaceId();
    const id = dr.record._id;
    this.drawerSaving.set(true);
    this.drawerError.set('');
    if (dr.kind === 'memory') {
      const props = this.drawerEditMemory.properties;
      this.brainApi.updateMemory(spaceId, id, {
        fact: this.drawerEditMemory.fact.trim(),
        tags: this.drawerEditMemory.tags,
        entityIds: this.drawerEditMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean),
        description: this.drawerEditMemory.description.trim(),
        ...(Object.keys(props).length ? { properties: props } : {}),
      }).subscribe({
        next: (updated) => {
          this.drawerSaving.set(false);
          this.drawerRecord.set({ kind: 'memory', record: updated });
          this.nodeMemories.update(list => list.map(m => m._id === id ? updated : m));
        },
        error: (err) => { this.drawerSaving.set(false); this.drawerError.set(err?.error?.error ?? err?.message ?? 'Save failed'); },
      });
    } else {
      const resolvedKind = this.drawerEditChrono.kind === '__custom__'
        ? (this.drawerEditChrono.customKind.trim() as ChronoType)
        : this.drawerEditChrono.kind as ChronoType;
      this.brainApi.updateChrono(spaceId, id, {
        title: this.drawerEditChrono.title.trim(),
        type: resolvedKind,
        status: this.drawerEditChrono.status as ChronoStatus,
        ...(this.drawerEditChrono.startsAt ? { startsAt: new Date(this.drawerEditChrono.startsAt).toISOString() } : {}),
        ...(this.drawerEditChrono.endsAt ? { endsAt: new Date(this.drawerEditChrono.endsAt).toISOString() } : {}),
        description: this.drawerEditChrono.description.trim(),
        tags: this.drawerEditChrono.tags,
        entityIds: this.drawerEditChrono.entityIds.split(',').map(s => s.trim()).filter(Boolean),
        ...(this.drawerEditChrono.memoryIds.trim() ? { memoryIds: this.drawerEditChrono.memoryIds.split(',').map(s => s.trim()).filter(Boolean) } : {}),
      }).subscribe({
        next: (updated) => {
          this.drawerSaving.set(false);
          this.drawerRecord.set({ kind: 'chrono', record: updated });
          this.nodeChrono.update(list => list.map(c => c._id === id ? updated : c));
        },
        error: (err) => { this.drawerSaving.set(false); this.drawerError.set(err?.error?.error ?? err?.message ?? 'Save failed'); },
      });
    }
  }

  entityChips(ids: string): Array<{ id: string; name: string }> {
    const cache = this.entityNameCache();
    return ids.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id, name: cache[id] ?? id }));
  }

  removeEntityId(target: { entityIds: string }, id: string): void {
    target.entityIds = target.entityIds.split(',').map(s => s.trim()).filter(s => s && s !== id).join(', ');
  }

  openFlyout(key: string): void {
    this.flyoutField.set(key);
    let ids = '';
    if (key === 'drawer-memory-entityIds') ids = this.drawerEditMemory.entityIds;
    if (key === 'drawer-chrono-entityIds') ids = this.drawerEditChrono.entityIds;
    const spaceId = this.activeSpaceId();
    if (spaceId && ids) {
      const unknown = ids.split(',').map(s => s.trim()).filter(s => s && !this.entityNameCache()[s]);
      if (unknown.length) this.resolveEntityNamesById(unknown);
    }
  }

  closeFlyout(): void { this.flyoutField.set(''); }

  pickDrawerEntity(ent: Entity, field: string): void {
    this.entityNameCache.update(c => ({ ...c, [ent._id]: ent.name }));
    if (field === 'drawer-memory-entityIds') {
      const parts = this.drawerEditMemory.entityIds.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.includes(ent._id)) parts.push(ent._id);
      this.drawerEditMemory.entityIds = parts.join(', ');
    } else if (field === 'drawer-chrono-entityIds') {
      const parts = this.drawerEditChrono.entityIds.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.includes(ent._id)) parts.push(ent._id);
      this.drawerEditChrono.entityIds = parts.join(', ');
    }
  }

  private resolveEntityNamesById(ids: string[]): void {
    const spaceId = this.activeSpaceId();
    if (!spaceId || !ids.length) return;
    const unknown = ids.filter(id => !this.entityNameCache()[id]);
    if (!unknown.length) return;
    this.brainApi.getEntitiesByIds(spaceId, unknown).subscribe({
      next: ({ entities }) => {
        const patch: Record<string, string> = {};
        for (const e of entities) patch[e._id] = e.name;
        this.entityNameCache.update(c => ({ ...c, ...patch }));
      },
      error: () => {},
    });
  }

  private toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  onPopupSaved(_evt: Record<string, unknown>): void {
    this.popupRecord.set(null);
    const root = this.rootEntity();
    if (root) {
      this.traverse(root._id, this.depth(), this.direction());
      const sel = this.selectedNode();
      if (sel) this.loadNodeDetails(sel._id);
      const edge = this.selectedEdge();
      if (edge) this.loadEdgeDetails(edge);
    }
  }

  // â”€â”€ URL management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  private updateUrl(entityId: string, push = false): void {
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

